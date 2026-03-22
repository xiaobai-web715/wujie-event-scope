import { onlyLettersAndNumbers } from "./regx"
export const targetToLNU = (string: string) => {
    return string.replace(onlyLettersAndNumbers, '').toUpperCase()
}