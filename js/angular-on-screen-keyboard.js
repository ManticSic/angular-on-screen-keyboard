/* global angular:false */
angular.module('onScreenKeyboard', ['ngSanitize'])
    .directive('onScreenKeyboard', function ($timeout, $document) {
      'use strict';
      
        return {
            restrict: 'E',
            bindToController: true,
            controllerAs: 'ctrl',
            scope: {
                langs : '=?',
                uppercaseAllWords : '@'
            },
            controller: function($sce){
                var ctrl = this;
                
                // todo fix me
                
                if (!ctrl.langs) {
                    ctrl.langs = [[
                        ['X', 'X', 'X', 'X', {type: 'erase', colspan: 2, text: '&lArr;'}],
                        [{type: 'margin'},['q', 'Q', '1'], ['w', 'W','2'], ['e', 'E','3'], ['r', 'R', '4'], ['t', 'T', '5']],
                        [{type: 'caps', colspan: 1, text:'caps'},{type: 'shift', colspan: 1,text:'shift'},{type: 'alt', colspan: 1, text: 'alt'}, {type: 'lang', colspan: 1, text:'lang1'}, {type: 'space', colspan: 2, text: ' '}]
                    ]];
                }
                
                ctrl.currentLayout = 0;

                ctrl.getText = function(key){
                    var val;
                    if (angular.isString(key)) {
                        if (ctrl.isAlt) {
                            val = ''
                        } else if (ctrl.isUpperCase) {
                            val = key.toUpperCase();
                        } else {
                            val = key.toLowerCase();
                        }
                    } else if (angular.isArray(key)) {
                        if (ctrl.isAlt) {
                            val = key[2] ? key[2] : '';
                        } else if (ctrl.isUpperCase) {
                            val = key[1] ? key[1] : '';
                        } else {
                            val = key[0] ? key[0] : '';
                        }
                    } else {
                        if (key.type === 'margin') {
                            val = '';
                        } else {
                            if (key.text) {
                                val = key.text
                            } else {
                                if (ctrl.isAlt) {
                                    val = key.alt ? key.alt : '';
                                } else if (ctrl.isUpperCase) {
                                    val = key.upperCase ? key.upperCase : '';
                                } else {
                                    val = key.lowerCase ? key.lowerCase : '';
                                }
                            }
                        }
                    }
                    
                    if (val && val.indexOf('&') > -1) {
                        return $sce.trustAsHtml(val)
                    }
                    
                    return val
                };
            },
            link: function (scope, element, attr) {
                var ctrl = scope.ctrl;
                ctrl.isUpperCase = false;
                ctrl.isCaps = false;
                ctrl.isAlt = false;
                ctrl.lastInputCtrl = null;
                ctrl.startPos = null;
                ctrl.endPos = null;

                ctrl.printKeyStroke = function(key, event){
                    if (!ctrl.lastInputCtrl)
                        return;

                    ctrl.startPos = ctrl.lastInputCtrl.selectionStart;
                    ctrl.endPos = ctrl.lastInputCtrl.selectionEnd;

                    if (key.type === 'erase'){
                        ctrl.eraseKeyStroke();
                        return;
                    } else if (key.type === 'shift'){
                        ctrl.isAlt = false;
                        ctrl.isUpperCase = !ctrl.isUpperCase;
                        ctrl.isCaps = false;
                        return;
                    } else if (key.type === 'caps'){
                        ctrl.isAlt = false;
                        ctrl.isCaps = !ctrl.isCaps;
                        ctrl.isUpperCase = !!ctrl.isCaps;
                        return;
                    } else if (key.type === 'alt') {
                        ctrl.isCaps = false;
                        ctrl.isUpperCase = false;
                        ctrl.isAlt = !ctrl.isAlt;
                        return;
                    } else if (key.type === 'lang') {
                        var nextLayout = ctrl.currentLayout + 1;
                        ctrl.isCaps = false;
                        ctrl.isUpperCase = false;
                        ctrl.isAlt = false;
                        ctrl.isAltLayout = !ctrl.isAltLayout;
                        
                        if (nextLayout >= ctrl.langs.length) {
                            nextLayout = 0;
                        }
                        
                        ctrl.currentLayout = nextLayout;
                        
                        return;
                    }

                    var htmlKeyVal = angular.element(event.target || event.srcElement).text();
                    var lastInputCtrl = angular.element(ctrl.lastInputCtrl);
                    var val = lastInputCtrl.val();
                    var pre = val.substring(0, ctrl.startPos);
                    var post = val.substring(ctrl.endPos, val.length);
                    lastInputCtrl.val(pre + htmlKeyVal + post);
                    lastInputCtrl.triggerHandler('change');

                    ctrl.startPos += htmlKeyVal.length;
                    ctrl.endPos += htmlKeyVal.length;
                    ctrl.lastInputCtrl.selectionStart = ctrl.startPos;
                    ctrl.lastInputCtrl.selectionEnd = ctrl.startPos;
                    ctrl.setKeyboardLayout();
                };

                ctrl.refocus = function () {
                    ctrl.lastInputCtrl.focus();
                };

                ctrl.eraseKeyStroke = function () {
                    if (!ctrl.lastInputCtrl)
                        return;

                    var hasSel = ctrl.startPos !== ctrl.endPos;

                    var lastInputCtrl = angular.element(ctrl.lastInputCtrl);
                    var val = lastInputCtrl.val();
                    var pre = val.substring(0, hasSel ? ctrl.startPos : ctrl.startPos - 1);
                    var post = val.substring(ctrl.endPos, val.length);

                    lastInputCtrl.val(pre + post);
                    lastInputCtrl.triggerHandler('change');

                    if (hasSel) {
                        ctrl.endPos = ctrl.startPos;
                    }
                    else {
                        ctrl.startPos--;
                        ctrl.endPos--;
                    }
                    ctrl.lastInputCtrl.selectionStart = ctrl.startPos;
                    ctrl.lastInputCtrl.selectionEnd = ctrl.startPos;
                    ctrl.setKeyboardLayout();
                    ctrl.refocus();
                };

                ctrl.setKeyboardLayout = function () {
                    if (!ctrl.lastInputCtrl){
                        ctrl.isUpperCase = true;
                        return;
                    }
                    else if (ctrl.isCaps) {
                        ctrl.isUpperCase = true;
                    }
                    else if (ctrl.lastInputCtrl.className && ctrl.isUpperCase)
                        ctrl.isUpperCase = false;
                    else if (angular.element(ctrl.lastInputCtrl).val().length === 0) {
                        ctrl.isUpperCase = true;
                    }
                    else{
                        ctrl.isUpperCase = false;
                    }
                };

                var focusin = function(event){
                    var e = event.target || event.srcElement;

                    if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') {
                        ctrl.lastInputCtrl = e;
                        ctrl.setKeyboardLayout();
                        // scope.$digest();
                    }
                };

                var keyup = function(){
                    if (!ctrl.lastInputCtrl)
                        return;

                    ctrl.startPos = ctrl.lastInputCtrl.selectionStart;
                    ctrl.endPos = ctrl.lastInputCtrl.selectionEnd;

                    ctrl.setKeyboardLayout();
                    // scope.$digest();
                };

                $document.bind('focusin', focusin);
                $document.bind('keyup', keyup);

                scope.$on("$destroy", function() {
                    $document.unbind('focusin', focusin);
                    $document.unbind('keyup', keyup);
                });

                element.bind('contextmenu', function (event) {
                    event.preventDefault();
                    return false;
                });

                $timeout(function(){
                    ctrl.isUpperCase = true;
                },0);
            },
            templateUrl: '/templates/angular-on-screen-keyboard.html'
        };
    });
