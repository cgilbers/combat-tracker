import { z } from "zod";

const AttributeSchema = z.object({
    charisma: z.number().int(),
    constitution: z.number().int(),
    dexterity: z.number().int(),
    intelligence: z.number().int(),
    strength: z.number().int(),
    wisdom: z.number().int(),
});

const SavesSchema = z.object({
    charisma_save: z.number().int().nullish(),
    constitution_save: z.number().int().nullish(),
    dexterity_save: z.number().int().nullish(),
    intelligence_save: z.number().int().nullish(),
    strength_save: z.number().int().nullish(),
    wisdom_save: z.number().int().nullish(),
});
const ActionSchema = z.object({
    name: z.string(),
    desc: z.string(),
    attack_bonus: z.number().nullable().optional(),
    damage_dice: z.string().nullable().optional(),
});

const AbilitySchema = z.object({
    name: z.string(),
    desc: z.string(),
});

const SpeedSchema = z
    .object({
        notes: z.string().optional(),
        hover: z.boolean().optional(),
    })
    .catchall(z.number());

const SkillsSchema = z.record(z.string(), z.number());

// --- Monster Schema ---
export const MonsterSchema = z
    .object({
        name: z.string(),
        slug: z.string(),
        size: z.string(),
        type: z.string(),
        subtype: z.string().nullable(),
        alignment: z.string(),
        armor_class: z.number(),
        armor_desc: z.string().nullable(),
        hit_points: z.number(),
        hit_dice: z.string(),
        speed: SpeedSchema,
        perception: z.number().nullable(),
        skills: SkillsSchema.optional(),
        damage_vulnerabilities: z.string(),
        damage_resistances: z.string(),
        damage_immunities: z.string(),
        condition_immunities: z.string(),
        senses: z.string(),
        languages: z.string(),
        challenge_rating: z.string(),
        cr: z.number(),
        actions: z.array(ActionSchema),
        special_abilities: z.array(AbilitySchema).nullish(),
        legendary_actions: z.array(ActionSchema).nullish(),
        legendary_desc: z.string().nullable(),
        bonus_actions: z.array(ActionSchema).nullish(),
        reactions: z.array(ActionSchema).nullish(),
        desc: z.string(),
        environments: z.array(z.string()),
        group: z.string().nullable(),
        img_main: z.string().nullable(),
        spell_list: z.array(z.string().url()),
        document__title: z.string(),
    })
    .extend(AttributeSchema.shape)
    .extend(SavesSchema.shape);

export type Monster = z.infer<typeof MonsterSchema>;
