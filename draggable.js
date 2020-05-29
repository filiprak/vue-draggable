_ikolExport('@ikol/src/common/directives/draggable', [
    'vue'
], function (
    Vue
) {
    'use-strict';
    
    /* eslint-disable-next-line ik-check-case */
    const Evt = new Vue({});
    
    const EVT_DRAG_START = 'ik-draggable.drag-start';
    const EVT_DRAG_END = 'ik-draggable.drag-end';
    
    const DATA_KEY = 'ik-draggable';
    const DATA_DROP_TARGET_KEY = 'ik-drop-target';
    
    
    const config = {
        bind: function (el, binding, vnode) {
            config.update(el, binding, vnode);
            
            Evt.$on(EVT_DRAG_START, function () {
                const data = el[DATA_KEY];
                data.original_evts = el.style.getPropertyValue('pointer-events');
                data.original_evts_prior = el.style.getPropertyPriority('pointer-events');
                el.style.setProperty('pointer-events', 'none', 'important');
            });
            Evt.$on(EVT_DRAG_END, function () {
                const data = el[DATA_KEY];
                el.style.setProperty('pointer-events', data.original_evts, data.original_evts_prior);
            });
        },
        update: function (el, binding, vnode) {
            
            const moveStart = function (event) {
                const data = el[DATA_KEY];
                const rect = el.getBoundingClientRect();
                const position = getMousePosition(event);
                
                data.top_offset = position.top - rect.top;
                data.left_offset = position.left - rect.left;
                
                if (data.dragged_el) {
                    data.dragged_el.remove();
                }
                
                if (data.ghost_el) {
                    data.ghost_el.remove();
                }
                
                data.dragged_el = createDraggedElement();
                data.ghost_el = createGhostElement();
                
                data.original_display = el.style.display;
                el.style.display = 'none';
                
                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', moveEnd);
                document.addEventListener('touchmove', move, {passive: false});
                document.addEventListener('touchend', moveEnd);
                
                Evt.$emit(EVT_DRAG_START, data);
            };
            
            const move = function (event) {
                event.preventDefault();
                
                const position = getMousePosition(event);
                
                const data = el[DATA_KEY];
                
                if (data.dragged_el) {
                    const dragged_x = position.left - data.left_offset;
                    const dragged_y = position.top - data.top_offset;
                    
                    data.dragged_el.style.left = dragged_x;
                    data.dragged_el.style.top = dragged_y;
                    
                    detectDropTarget(position.left, position.top);
                }
            };
            
            const moveEnd = function (event) {
                event.preventDefault();
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', moveEnd);
                document.removeEventListener('touchmove', move);
                document.removeEventListener('touchend', moveEnd);
                
                const data = el[DATA_KEY];
                
                if (data.dragged_el) {
                    data.dragged_el.remove();
                }
                
                if (data.ghost_el) {
                    data.ghost_el.remove();
                }
                
                data.target_el = null;
                
                el.style.display = data.original_display;
                
                Evt.$emit(EVT_DRAG_END, data);
            };
            
            function dropTargetEnter(drop_target_el) {
                const data = el[DATA_KEY];
                drop_target_el.appendChild(data.ghost_el);
            }
            
            function dropTargetLeave(drop_target_el) {
                //target_el.style.background = null;
            }
            
            function detectDropTarget(mouse_x, mouse_y) {
                const data = el[DATA_KEY];
                const dragged_el = data.dragged_el;
                
                const hit_x = mouse_x - data.left_offset + dragged_el.getBoundingClientRect().width / 2;
                const hit_y = mouse_y - data.top_offset;
                
                data.dragged_el.hidden = true;
                data.ghost_el.hidden = true;
                let mouse_el = document.elementFromPoint(hit_x, hit_y);
                /*console.log('mouse_el', mouse_el)
                console.log('drop_target_el', data.target_el)*/
                data.dragged_el.hidden = false;
                data.ghost_el.hidden = false;
                
                if (mouse_el) {
                    if (mouse_el !== data.target_el) {
                        let current_node = mouse_el;
                        let drop_target_el = null;
                        
                        // find closest drop target element
                        while (current_node) {
                            //console.log(current_node)
                            if (current_node[DATA_DROP_TARGET_KEY]) {
                                drop_target_el = current_node;
                                break;
                            }
                            current_node = current_node.parentElement;
                        }
                        
                        
                        if (drop_target_el) {
                            if (data.target_el) {
                                dropTargetLeave(data.target_el);
                            }
                            data.target_el = drop_target_el;
                            dropTargetEnter(drop_target_el);
                        }
                        
                    }
                    
                    if (data.target_el) {
                        const target_top = hit_y - data.target_el.getBoundingClientRect().top;
                        data.ghost_el.style.top = target_top - target_top % 15;
                    }
                }
            }
            
            function getMousePosition(event) {
                if (event instanceof MouseEvent) {
                    return {
                        left: event.clientX,
                        top: event.clientY
                    };
                }
                if (event instanceof TouchEvent) {
                    const touch = event.changedTouches[event.changedTouches.length - 1];
                    return {
                        left: touch.clientX,
                        top: touch.clientY
                    };
                }
            }
            
            function createDraggedElement() {
                const dragged = el.cloneNode(true);
                const rect = el.getBoundingClientRect();
                dragged.style.position = 'fixed';
                dragged.style.top = rect.top;
                dragged.style.left = rect.left;
                dragged.style.width = rect.width;
                dragged.style.height = rect.height;
                dragged.style.zIndex = 9999999;
                dragged.style.cursor = 'grabbing';
                el.parentElement.appendChild(dragged);
                return dragged;
            }
            
            function createGhostElement() {
                const ghost = document.createElement('div');
                const rect = el.getBoundingClientRect();
                ghost.style.background = 'lightblue';
                ghost.style.position = 'absolute';
                ghost.style.top = 0;
                ghost.style.left = 0;
                ghost.style.width = '100%';
                ghost.style.height = rect.height;
                ghost.style.zIndex = el.style.zIndex;
                //el.parentElement.appendChild(ghost);
                return ghost;
            }
            
            if (!el[DATA_KEY]) {
                el.addEventListener('mousedown', moveStart);
                el.addEventListener('touchstart', moveStart, {passive: false});
                
                el[DATA_KEY] = {
                    top_offset: 0,
                    left_offset: 0,
                    target_el: null,
                };
            }
            
        },
        unbind: function (el) {
            delete el[DATA_KEY];
            Evt.$off(EVT_DRAG_START);
            Evt.$off(EVT_DRAG_END);
        }
    };
    
    // register directive globally
    Vue.directive('draggable', config);
    
    function onDropTargetEnter(event) {
    
    }
    
    Vue.directive('dropTarget', {
        bind: function (el, binding, vnode, old_vnode) {
            el[DATA_DROP_TARGET_KEY] = true;
        },
        unbind: function (el) {
            delete el[DATA_DROP_TARGET_KEY];
        }
    });
    
    return config;
    
}, typeof module !== 'undefined' ? module : {});
