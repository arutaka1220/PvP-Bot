import { world, BlockLocation, MinecraftEffectTypes, ItemStack, Items, EntityRaycastOptions, MinecraftBlockTypes, Location } from "mojang-minecraft";
import { register, SimulatedPlayer } from "mojang-gametest";
import { setTickTimeout as timeout, setTickInterval as interval, clearTickInterval as clearInterval, clearTickTimeout as clearTimeout} from "./scheduling";
import config from "./config";

try{
    world.getDimension("overworld").runCommand("scoreboard objectives remove health");
}catch{}

let lastPos = {
    x: null,
    z: null
};

let stackCount = 0;

register("pvp", "bot", (test) => {
    // プレイヤー
    let SPlayer = test.spawnSimulatedPlayer(new BlockLocation(0,0,0), config.name);
    let closest = SPlayer.runCommand(`testfor @p[rm=1,name=!"${config.name}"]`).victim[0];

    // 剣を持たせる
    config.weapon.sword !== null ? SPlayer.setItem(new ItemStack(Items.get("minecraft:"+config.weapon.sword)), 0):"";
    config.weapon.sword !== null ? SPlayer.runCommand("replaceitem entity @s slot.armor.chest 0 diamond_chestplate"):"";
    config.weapon.sword !== null ? SPlayer.runCommand("replaceitem entity @s slot.armor.feet 0 diamond_boots"):"";
    config.weapon.sword !== null ? SPlayer.runCommand("replaceitem entity @s slot.armor.head 0 diamond_helmet"):"";
    config.weapon.sword !== null ? SPlayer.runCommand("replaceitem entity @s slot.armor.legs 0 diamond_leggings"):"";

    config.debug ? world.say(`§8[§a${SPlayer.name}§8] {SYSTEM} §7initialize complete(DEBUG=TRUE)`):world.say(`§8[§a${SPlayer.name}§8] {SYSTEM} §7initialize complete(DEBUG=FALSE)`);

    /** ターゲット @type { Player } */
    let player;
    player = getPlayerByName(closest);

    // 定期的に攻撃先を変える
    interval(() => {
        closest = SPlayer.runCommand(`testfor @p[rm=1,name=!"${config.name}"]`).victim[0];
        if(player.name != closest) {
            player = getPlayerByName(closest);
            // 攻撃先に移動とかする
            SPlayer.navigateToEntity(player);
            SPlayer.lookAtEntity(player);
            config.debug ? world.say(`§8[§a${SPlayer.name}§8] {TARGET} §7Change Target(NAME=${player.name})`):"";    
        }
        SPlayer.navigateToEntity(player);
        SPlayer.lookAtEntity(player);
        SPlayer.health = SPlayer.getComponent("health").current;
    }, 10);

    //1tickごとに処理を繰り返す
    interval(() => {
        SPlayer.addEffect(MinecraftEffectTypes.speed, 2, 1, false);

        // プレイヤーがターゲットに対して目線を合わせていたらターゲットに対して攻撃する
        const r = new EntityRaycastOptions();
        r.maxDistance = config.reach;
        let a = SPlayer.getEntitiesFromViewVector(r)[0];
        if(a && a.nameTag == closest) {
            let {x,y,z} = SPlayer.location;
            let {x:x1,y:y1,z:z1} = player.location;
            let reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);
            let result = SPlayer.attackEntity(a);
            if(result == true) {
                config.debug ? world.say(`§8[§a${SPlayer.name}§8] {ATTACK} §bAttack(NAME=${a.name},RESULT=${String(result).toUpperCase()},REACH=${reach.toFixed(2)})`):"";
            }
        }

        // y軸に差があったらプレイヤーを登らせたりする
        let sa = Math.trunc(player.location.y) - Math.trunc(SPlayer.location.y);
        if(sa >= 3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            config.debug ? world.say(`§8[§a${SPlayer.name}§8] {BLOCK} §dBlockPlace(Y=${sa})`):"";
            let b = getBlock2(new BlockLocation(m(SPlayer.location.x), m(SPlayer.location.y)+2, m(SPlayer.location.z)));
            if(b.id !== "minecraft:air") {
                const d = MinecraftBlockTypes.air.createDefaultBlockPermutation();
                b.setPermutation(d);
            }

            place(SPlayer);


        } else if(sa <= -3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            config.debug ? world.say(`§8[§a${SPlayer.name}§8] {BLOCK} §cBlockBreak(Y=${sa})`):"";
            break_(SPlayer);
        }
    }, 1);

    interval(() => {
        //config.debug ? world.say(`§8[§a${SPlayer.name}§8] §7Target(NAME=${player.name})`):"";
        // 場所が変わってなかったら上に登らせる
        if (lastPos.x === SPlayer.location.x.toFixed(1) && lastPos.z === SPlayer.location.z.toFixed(1)) {
            stackCount++;
            if(stackCount > config.errorStackCount) {
                test.fail(`StackCount: ${stackCount}`);
                clearInterval(1);
                clearInterval(2);
                clearInterval(3);
                return
            }
            config.debug ? world.say(`§8[§a${SPlayer.name}§8] §6Stack(X=${Math.floor(SPlayer.location.x)},Y=${Math.floor(SPlayer.location.y)},Z=${Math.floor(SPlayer.location.z)},COUNT=${stackCount})`):"";

            let z = getBlock2(new BlockLocation(m(SPlayer.location.x) + 1, m(SPlayer.location.y), m(SPlayer.location.z)));
            let x = getBlock2(new BlockLocation(m(SPlayer.location.x) - 1, m(SPlayer.location.y), m(SPlayer.location.z)));
            let c = getBlock2(new BlockLocation(m(SPlayer.location.x), m(SPlayer.location.y), m(SPlayer.location.z) + 1));
            let v = getBlock2(new BlockLocation(m(SPlayer.location.x), m(SPlayer.location.y), m(SPlayer.location.z) - 1));
            let b = getBlock2(new BlockLocation(m(SPlayer.location.x), m(SPlayer.location.y)+2, m(SPlayer.location.z)));
            if (z.id !== "minecraft:air" &&
                x.id !== "minecraft:air" &&
                c.id !== "minecraft:air" &&
                v.id !== "minecraft:air") {
                    place(SPlayer)
                    if(b.id !== "minecraft:air") {
                        const d = MinecraftBlockTypes.air.createDefaultBlockPermutation();
                        b.setPermutation(d);
                    }
                };
        } else {
            stackCount = 0;
        }
        lastPos.x = SPlayer.location.x.toFixed(1);
        lastPos.z = SPlayer.location.z.toFixed(1);
    }, 5)

}).structureName("mystructure:test").maxTicks(20*60*5);

world.events.entityHurt.subscribe(ev => {
    const { hurtEntity, damagingEntity, damage } = ev;
    if(hurtEntity.name == undefined || damagingEntity.name == undefined) return;
     
    let health = hurtEntity.getComponent("health").current;

    hurtEntity.onScreenDisplay.setActionBar(`§d${damagingEntity.name} §cから §d${damage}§eDamage §cを受けた(残り §d${Math.floor(health)}§c)`);
    damagingEntity.onScreenDisplay.setActionBar(`§d${hurtEntity.name} §bに §d${damage}§eDamage §bを与えた(残り §d${Math.floor(health)}§b)`);
});

world.events.tick.subscribe(ev => {
    for(const player of world.getPlayers()) {
        let health = player.getComponent("health").current;
        try{
            player.runCommand(`scoreboard players set @s health ${Math.floor(health)}`);
        } catch {
            world.getDimension("overworld").runCommand("scoreboard objectives add health dummy §d§lHP");
            world.getDimension("overworld").runCommand("scoreboard objectives setdisplay belowname health");
            world.getDimension("overworld").runCommand("scoreboard objectives setdisplay sidebar health");
        }

        player.onScreenDisplay.setActionBar(`${Math.floor(player.location.x)}, ${Math.floor(player.location.y)}, ${Math.floor(player.location.z)}`)
    }
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

function getBlock2(BlockLoc) {
    return world.getDimension("overworld").getBlock(BlockLoc);
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