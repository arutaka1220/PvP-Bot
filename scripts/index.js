import { world, BlockLocation, GameMode, MinecraftEffectTypes, ItemStack, MinecraftItemTypes, Items, EntityRaycastOptions, MinecraftBlockTypes, Player, Location, Vector, BlockRaycastOptions} from "mojang-minecraft";
import { register, SimulatedPlayer } from "mojang-gametest";
import { setTickTimeout as timeout, setTickInterval as interval} from "./scheduling";

const config = {
    name: "PvP Bot",
    block: MinecraftBlockTypes.planks.createDefaultBlockPermutation(),
    sword: "minecraft:iron_sword",
    debug: true
}

let lastPos = {
    x: null,
    z: null
};


register("pvp", "bot", (test) => {
    // プレイヤー
    let SPlayer = test.spawnSimulatedPlayer(new BlockLocation(0,0,0), config.name);
    let tikai = SPlayer.runCommand(`testfor @p[m=!c,rm=1,name=!"${config.name}"]`).victim[0];

    // 剣を持たせる
    SPlayer.setItem(new ItemStack(Items.get(config.sword)), 0);
    SPlayer.runCommand("replaceitem entity @s slot.armor.chest 0 diamond_chestplate");
    SPlayer.runCommand("replaceitem entity @s slot.armor.feet 0 diamond_boots");
    SPlayer.runCommand("replaceitem entity @s slot.armor.head 0 diamond_helmet");
    SPlayer.runCommand("replaceitem entity @s slot.armor.legs 0 diamond_leggings");

    
    config.debug ? world.say("initialize complete"):"";

    /** ターゲット @type { Player } */
    let player;
    player = getPlayerByName(tikai);

    // 定期的に攻撃先を変える
    interval(() => {
        tikai = SPlayer.runCommand(`testfor @p[m=!c, rm=1,name=!"${config.name}"]`).victim[0];
        player = getPlayerByName(tikai);
        // 攻撃先に移動とかする
        SPlayer.navigateToEntity(player);
        SPlayer.lookAtEntity(player);
        config.debug ? world.say(`changed target to: ${player.name}`):"";
    }, 10);

    //1tickごとに処理を繰り返す
    interval(() => {
        SPlayer.addEffect(MinecraftEffectTypes.speed, 2, 1, false);

        // プレイヤーがターゲットに対して目線を併せていたらターゲットに対して攻撃する
        const r = new EntityRaycastOptions();
        r.maxDistance = 7;
        let a = SPlayer.getEntitiesFromViewVector(r)[0];
        if(a && a.nameTag == tikai) {
            SPlayer.attack();
            config.debug ? world.say(`attack to: ${a.name}`):"";
        }

        // y軸に差があったらプレイヤーを登らせたりする
        let sa = Math.trunc(player.location.y) - Math.trunc(SPlayer.location.y);
        if(sa >= 3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            config.debug ? world.say(`block place(y="${sa}")`):"";
            place(SPlayer);
        } else if(sa <= -3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            config.debug ?  world.say(`block break(y="${sa}")`):"";
            break_(SPlayer);
        }
    }, 1);

    interval(() => {
        // 場所が変わってなかったら上に登らせる
        if (lastPos.x === SPlayer.location.x.toFixed(1) && lastPos.z === SPlayer.location.z.toFixed(1)) {
            config.debug ? world.say("player stack"):"";
            //for(let i = 0;i<5;i++) 
            world.say(getBlock(SPlayer.location.x, SPlayer.location.y, SPlayer.location.z));
            if (getBlock(SPlayer.location.x, SPlayer.location.y, SPlayer.location.z))
                place(SPlayer);

            /*const r = new BlockRaycastOptions();
            r.maxDistance = 7;
            let block = SPlayer.getBlockFromViewVector();
            try{
                block.setPermutation(MinecraftBlockTypes.air.createDefaultBlockPermutation());
            }catch{};*/
        }
        lastPos.x = SPlayer.location.x.toFixed(1);
        lastPos.z = SPlayer.location.z.toFixed(1);
    }, 5)

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
function place(player) {
    if(getBlock(m(player.location.x),m(player.location.y)-1,m(player.location.z)).id !== "minecraft:air") return;
    player.jump();
    timeout(() => {
        player.setRotation(90,90);
        player.dimension.getBlock(new BlockLocation(m(player.location.x),m(player.location.y)-1,m(player.location.z))).setPermutation(config.block);
    }, 30);
}

/**
 * 
 * @param {SimulatedPlayer} player 
 */
function break_(player) {
    if(getBlock(new Location(m(player.location.x),m(player.location.y)-1,m(player.location.z))).id == "minecraft:air") return;
    player.setRotation(90,90);
    const d = MinecraftBlockTypes.air.createDefaultBlockPermutation();
    getBlock(new Location(m(player.location.x),m(player.location.y)-1,m(player.location.z))).setPermutation(d);
}