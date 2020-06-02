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
    
    function isElementAbovePoint(el, x, y) {
        const rect = el.getBoundingClientRect();
        return (rect.top + rect.height / 2 < y);
    }
    
    function isElementBelowPoint(el, x, y) {
        const rect = el.getBoundingClientRect();
        return (rect.top + rect.height / 2 >= y);
    }
    
    function swapElements(el1, el2) {
        const parent1 = el1.parentNode;
        const sibling1 = el1.nextSibling === el2 ? el1 : el1.nextSibling;
        
        el2.parentNode.insertBefore(el1, el2);
        parent1.insertBefore(el2, sibling1);
    }
    
    
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
                const target_data = drop_target_el[DATA_DROP_TARGET_KEY];
                
                if (target_data.absolute) {
                    data.ghost_el.style.position = 'absolute';
                } else {
                    data.ghost_el.style.position = 'relative';
                    data.ghost_el.style.top = 0;
                    data.ghost_el.style.left = 0;
                }
                
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
                
                const org = data.dragged_el.style.zIndex;
                data.dragged_el.style.zIndex = -99;
                data.ghost_el.hidden = true;
                let mouse_el = document.elementFromPoint(hit_x, hit_y);
                //console.log('dragged_el', data.dragged_el)
                //console.log('mouse_el', mouse_el, hit_x, hit_y)
                //console.log('drop_target_el', data.target_el)
                data.dragged_el.style.zIndex = org;
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
                            if (drop_target_el !== data.target_el) {
                                if (data.target_el) {
                                    dropTargetLeave(data.target_el);
                                }
                                data.target_el = drop_target_el;
                                dropTargetEnter(drop_target_el);
                            }
                        }
                        
                    }
                    
                    // snap ghost element inside drop target element
                    if (data.target_el) {
                        const target_data = data.target_el[DATA_DROP_TARGET_KEY];
                        if (target_data.snap_interval) {
                            const target_top = hit_y - data.target_el.getBoundingClientRect().top;
                            data.ghost_el.style.top = target_top - target_top % target_data.snap_interval;
                        }
                    }
                    
                    // sorting elements
                    if (data.target_el) {
                        if (!data.target_el[DATA_DROP_TARGET_KEY].absolute) {
                            const prev_el = data.ghost_el.previousElementSibling;
                            const next_el = data.ghost_el.nextElementSibling;
                            
                            if (prev_el && isElementAbovePoint(prev_el, mouse_x, mouse_y)) {
                                //swapElements(data.ghost_el, data.dragged_el);
                                swapElements(data.ghost_el, prev_el);
                            } else if (next_el && isElementBelowPoint(next_el, mouse_x, mouse_y)) {
                                swapElements(next_el, data.ghost_el);
                                //swapElements(next_el, data.dragged_el);
                            }
                        }
                    }
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
    
    Vue.directive('dropTarget', {
        bind: function (el, binding, vnode) {
            const default_options = {
                snap_interval: null
            };
            el[DATA_DROP_TARGET_KEY] = $.extend(default_options, binding.value || {});
        },
        unbind: function (el) {
            delete el[DATA_DROP_TARGET_KEY];
        }
    });
    
    Vue.directive('dragAutoscroll', {
        bind: function (el, binding, vnode) {
            const SCROLL_INTERVAL_MSEC = 30;
            const SCROLL_STEP = 30;
            const BOUND_SIZE = 50;
            
            const intervals = {
                top: null,
                bottom: null,
                left: null,
                right: null,
            };
            
            function startAutoscroll(direction, callback) {
                if (!intervals[direction]) {
                    intervals[direction] = setInterval(callback, SCROLL_INTERVAL_MSEC);
                }
            }
            
            function stopAutoscroll(direction) {
                clearInterval(intervals[direction]);
                intervals[direction] = null;
            }
            
            function move(event) {
                const position = getMousePosition(event);
                const rect = el.getBoundingClientRect();
                
                const inside = position.left >= rect.left && position.left <= rect.right &&
                    position.top >= rect.top && position.top <= rect.bottom;
                
                
                if (inside && position.top < rect.top + BOUND_SIZE) {
                    startAutoscroll('top', function () {
                        el.scrollTop = Math.max(el.scrollTop - SCROLL_STEP, 0);
                    });
                } else {
                    stopAutoscroll('top');
                }
                
                if (inside && position.top > rect.bottom - BOUND_SIZE) {
                    startAutoscroll('bottom', function () {
                        el.scrollTop = Math.min(el.scrollTop + SCROLL_STEP, el.scrollHeight - el.clientHeight);
                    });
                } else {
                    stopAutoscroll('bottom');
                }
                
                if (inside && position.left < rect.left + BOUND_SIZE) {
                    startAutoscroll('left', function () {
                        el.scrollLeft = Math.max(el.scrollLeft - SCROLL_STEP, 0);
                    });
                } else {
                    stopAutoscroll('left');
                }
                
                if (inside && position.left > rect.right - BOUND_SIZE) {
                    startAutoscroll('right', function () {
                        el.scrollLeft = Math.min(el.scrollLeft + SCROLL_STEP, el.scrollWidth - el.clientWidth);
                    });
                } else {
                    stopAutoscroll('right');
                }
            }
            
            Evt.$on(EVT_DRAG_START, function () {
                document.addEventListener('mousemove', move);
            });
            Evt.$on(EVT_DRAG_END, function () {
                for (let dir in intervals) {
                    stopAutoscroll(dir);
                }
                document.removeEventListener('mousemove', move);
            });
        },
        unbind: function (el) {
            Evt.$off(EVT_DRAG_START);
            Evt.$off(EVT_DRAG_END);
        }
    });
    
    return config;
    
}, typeof module !== 'undefined' ? module : {});
