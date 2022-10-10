import { MinecraftBlockTypes } from "mojang-minecraft"
export default
{
    name: "PvP Bot",
    tagName: "PvP Bot",
    block: MinecraftBlockTypes.cobblestone.createDefaultBlockPermutation(),
    debug: true,
    reach: 5,
    errorStackCount: null,
    byeeeHealth: 10,

    weapon: {
        // nullにすることで持たせないようにする
        sword: "iron_sword",
        head: "diamond_helmet",
        chestplate: "diamond_chestplate",
        legs: "diamond_leggings",
        feet: "diamond_boots",
    }
}