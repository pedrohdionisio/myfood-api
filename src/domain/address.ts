import { slugify } from './slug.js'

export interface IAddressCity {
  city: string
  state: string
}

export function isSameCity(left: IAddressCity, right: IAddressCity): boolean {
  return slugify(left.city) === slugify(right.city) && left.state === right.state
}
