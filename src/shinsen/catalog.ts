import heroesJson from './data/heroes.json'
import metaJson from './data/meta.json'
import skillsJson from './data/skills.json'
import type { Hero, Skill } from './types'

export const heroes = heroesJson as Hero[]
export const skills = skillsJson as Skill[]
export const catalogMeta = metaJson as {
  databaseVersion: string
  updatedAt: string
  heroCount: number
  skillCount: number
  sources: { name: string; url: string }[]
}

export const heroById = new Map(heroes.map((hero) => [hero.id, hero]))
export const skillById = new Map(skills.map((skill) => [skill.id, skill]))
