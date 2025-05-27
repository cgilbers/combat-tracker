import z from "zod";
import { baseUrls } from "../config";
import { MonsterSchema, type Monster } from "../schemas/monster";

export const searchCreatures = async (value: string): Promise<Monster[]> => {
    const response = await fetch(`${baseUrls.monsters}?search=${value}`);
    if (!response.ok) {
        throw new Error("Failed to fetch creatures");
    }
    const data = await response.json();

    const validatedData = z.array(MonsterSchema).safeParse(data.results);

    if (validatedData.success) {
        return validatedData.data;
    } else {
        console.error("Validation failed:", validatedData.error);
        throw new Error("Validation failed for creature data");
    }
};
