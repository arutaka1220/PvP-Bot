import { world, BlockLocation, GameMode, MinecraftEffectTypes, ItemStack, MinecraftItemTypes, Items, EntityRaycastOptions, MinecraftBlockTypes, Player, Location, Vector} from "mojang-minecraft";
import { register, SimulatedPlayer } from "mojang-gametest";
import { setTickTimeout as timeout, setTickInterval as interval} from "./scheduling";

register("pvp", "bot", (test) => {
    let SPlayer = test.spawnSimulatedPlayer(new BlockLocation(0,0,0), "Hacker");
    let tikai = SPlayer.runCommand("testfor @p[rm=1,name=!Hacker]").victim[0];
    /** @type { Player } */
    let player;
    player = getPlayerByName(tikai);
    interval(() => {
        tikai = SPlayer.runCommand("testfor @p[rm=1,name=!Hacker]").victim[0];
        player = getPlayerByName(tikai);
        let random = Math.floor(Math.random() * 2);
        if(random === 1) {
            placeItems(SPlayer, "minecraft:planks", 5)
        }
    }, 10);
    SPlayer.setItem(new ItemStack(MinecraftItemTypes.woodenSword), 0);
    interval(() => {
        SPlayer.navigateToEntity(player);
        SPlayer.lookAtEntity(player);
        const r = new EntityRaycastOptions();
        r.maxDistance = 7;
        let a = SPlayer.getEntitiesFromViewVector(r)[0];
        if(a && a.nameTag == tikai) {
            SPlayer.attack();
        }
        player.setRotation(player.rotation.x, -90);
        let sa = Math.trunc(player.location.y) - Math.trunc(SPlayer.location.y);
        if(sa >= 3) {
            placeItems(SPlayer);
        }
    }, 1);

}).structureName("mystructure:test").maxTicks(20*60*5);

world.events.entityHurt.subscribe(ev => {
    const { hurtEntity, damagingEntity, damage } = ev;
    if(hurtEntity.name == undefined || damagingEntity.name == undefined) return;
    hurtEntity.onScreenDisplay.setActionBar(`§d${damagingEntity.name} §bから §d${damage} §bを受けた`);
    damagingEntity.onScreenDisplay.setActionBar(`§d${hurtEntity.name} §bに §d${damage} §bを与えた`);
});


function getPlayerByName(name) {
    let pp = null;
    for(let p of world.getPlayers()) {
        if(p.name == name) pp = p;
    };
    return pp;
}

function m(i) {
    return Math.floor(i);
}

function getBlock(Loc) {
    return world.getDimension("overworld").getBlock(toBlockLocation(Loc));
}

function toBlockLocation(Loc) {
    return new BlockLocation(m(Loc.x), m(Loc.y), m(Loc.z))
}

/**
 * 
 * @param {SimulatedPlayer} player 
 */
function placeItems(player) {
    if(getBlock(m(player.location.x),m(player.location.y)-1,m(player.location.z)).id !== "minecraft:air") return;
    player.jump();
    timeout(() => {
        player.setRotation(90,90);
        const d = MinecraftBlockTypes.planks.createDefaultBlockPermutation();
        player.dimension.getBlock(new BlockLocation(m(player.location.x),m(player.location.y)-1,m(player.location.z))).setPermutation(d);
    }, 30);
}