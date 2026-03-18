export const fnNameRegx = /([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*|\[[^\]]+\])*)\s*\([^)]*\)/g;
export const fnBody = /function[^\(]*\([^\)]*\)[^\{]*\{([\s\S]*?)\}$/