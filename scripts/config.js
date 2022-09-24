import { MinecraftBlockTypes } from "mojang-minecraft"
export default
{
    name: "PvP Bot",
    block: MinecraftBlockTypes.planks.createDefaultBlockPermutation(),
    sword: "minecraft:iron_sword",
    debug: true,
    reach: 4,

    weapon: {
        // nullにすることで持たせないようにする
        sword: "iron_sword",
        chestplate: "diamond_chestplate",
        feet: "diamond_boots",
        head: "diamond_helmet",
        legs: "diamond_leggings"
    }
}