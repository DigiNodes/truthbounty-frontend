import { twMerge } from "tailwind-merge";

export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

function toVal(mix: ClassValue): string {
  let str = "";
  if (typeof mix === "string" || typeof mix === "number") {
    str += mix;
  } else if (typeof mix === "object" && mix !== null) {
    if (Array.isArray(mix)) {
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          const y = toVal(mix[k]);
          if (y) {
            if (str) {
              str += " ";
            }
            str += y;
          }
        }
      }
    } else {
      for (const key in mix) {
        if (mix[key]) {
          if (str) {
            str += " ";
          }
          str += key;
        }
      }
    }
  }
  return str;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(inputs.map(toVal).filter(Boolean).join(" "));
}
