import { world, BlockLocation, MinecraftEffectTypes, ItemStack, Items, EntityRaycastOptions, MinecraftBlockTypes, Location, Player } from "mojang-minecraft";
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

world.events.beforeChat.subscribe(ev => {
    const { message, sender } = ev;
    if(message == ".cancel") {
        ev.cancel = true;
        clearInterval(1);
        clearInterval(2);
        clearInterval(3);

        sender.tell(`§8[§aSystem§8] §7Interval(1,2,3) is Canceled!`);
    }
});

register("pvp", "bot", (test) => {
    // プレイヤー
    let SPlayer = test.spawnSimulatedPlayer(new BlockLocation(0,0,0), config.name);

    SPlayer.nigeru = false;
    SPlayer.addTag(config.tagName);
    let closest = SPlayer.runCommand(`testfor @p[rm=1,name=!"${config.name}"]`).victim[0];

    // 剣を持たせる
    config.weapon.sword !== null ? SPlayer.setItem(new ItemStack(Items.get("minecraft:"+config.weapon.sword)), 0):"";
    config.weapon.chestplate !== null ? SPlayer.runCommand(`replaceitem entity @s slot.armor.chest 0 ${config.weapon.chestplate}`):"";
    config.weapon.feet !== null ? SPlayer.runCommand(`replaceitem entity @s slot.armor.feet 0 ${config.weapon.feet}`):"";
    config.weapon.head !== null ? SPlayer.runCommand(`replaceitem entity @s slot.armor.head 0 ${config.weapon.head}`):"";
    config.weapon.legs !== null ? SPlayer.runCommand(`replaceitem entity @s slot.armor.legs 0 ${config.weapon.legs}`):"";

    debug(SPlayer.name, "SYSTEM", `initialize complete`, [{name: "DEBUG", value: config.debug, valueUpper: true}], DEBUG_TYPE.NOTICE);

    /** @type { Player } */
    let player;
    player = getPlayerByName(closest);

    // 定期的に攻撃先を変える
    interval(() => {
        closest = SPlayer.runCommand(`testfor @p[rm=1,name=!"${config.name}"]`).victim[0];
        if(player.name != closest) {
            player = getPlayerByName(closest);
            // 攻撃先に移動とかする
            !SPlayer.nigeru ? SPlayer.navigateToEntity(player):"";
            SPlayer.lookAtEntity(player);
            SPlayer.lookAtEntity(player);
            debug(SPlayer.name, "TARGET", `Change Target`, [{name: "NAME", value: player.name}], DEBUG_TYPE.INFO);
        }
        SPlayer.navigateToEntity(player);
        SPlayer.health = SPlayer.getComponent("health").current;
        if(SPlayer.health <= config.byeeeHealth) {
            world.say(`§8[§a${SPlayer.name}§8] §7さいなら！！`);
            SPlayer.moveToLocation(new Location(
                    Math.sign(player.location.x) === 1 ? -player.location.x : +player.location.x,
                    Math.sign(player.location.y) === 1 ? -player.location.y : +player.location.y,
                    Math.sign(player.location.z) === 1 ? -player.location.z : +player.location.z,
                ));
            SPlayer.nigeru = true;
        } else {
            SPlayer.nigeru = false;
        }
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
                let {x,y,z} = SPlayer.location;
                let {x:x1,y:y1,z:z1} = player.location;
                debug(SPlayer.name, "ATTACK", `Attack`, 
                [
                    {
                        name: "NAME",
                        value: a.name,
                    },
                    {
                        name: "RESULT",
                        value: result,
                        valueUpper: true
                    },
                    {
                        name: "REACH",
                        value: (Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2)).toFixed(2),
                        valueUpper: true
                    }
                ],
                DEBUG_TYPE.INFO);
            }
        }

        // y軸に差があったらプレイヤーを登らせたりする
        let sa = Math.trunc(player.location.y) - Math.trunc(SPlayer.location.y);
        if(sa >= 3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            let b = getBlock2(new BlockLocation(m(SPlayer.location.x), m(SPlayer.location.y)+2, m(SPlayer.location.z)));
            if(b.id !== "minecraft:air") {
                const d = MinecraftBlockTypes.air.createDefaultBlockPermutation();
                b.setPermutation(d);
            }

            place(SPlayer);
            debug(SPlayer.name, "BLOCK", `BlockPlace`, [{name: "Y", value: sa}], DEBUG_TYPE.INFO);
        } else if(sa <= -3 && lastPos.x !== SPlayer.location.x.toFixed(1) && lastPos.z !== SPlayer.location.z.toFixed(1)) {
            debug(SPlayer.name, "BLOCK", `BlockBreak`, [{name: "Y", value: sa}], DEBUG_TYPE.INFO);
            break_(SPlayer);
        }
    }, 1);

    interval(() => {
        //config.debug ? world.say(`§8[§a${SPlayer.name}§8] §7Target(NAME=${player.name})`):"";
        // 場所が変わってなかったら上に登らせる
        if (lastPos.x === SPlayer.location.x.toFixed(1) && lastPos.z === SPlayer.location.z.toFixed(1)) {
            stackCount++;
            if(config.errorStackCount !== null && stackCount > config.errorStackCount) {
                test.fail(`StackCount: ${stackCount}`);
                clearInterval(1);
                clearInterval(2);
                clearInterval(3);
                return
            }

            debug(SPlayer.name, "STACK", `Stack`, 
            [
                {
                    name: "X",
                    value: Math.floor(SPlayer.location.x)
                },
                {
                    name: "Y",
                    value: Math.floor(SPlayer.location.y)
                },
                {
                    name: "Z",
                    value: Math.floor(SPlayer.location.z)
                },
                {
                    name: "COUNT",
                    value: stackCount
                }
            ], DEBUG_TYPE.WARNING);

            let z = getBlock2(new BlockLocation(m(SPlayer.location.x)+1, m(SPlayer.location.y),   m(SPlayer.location.z)));
            let x = getBlock2(new BlockLocation(m(SPlayer.location.x)-1, m(SPlayer.location.y),   m(SPlayer.location.z)));
            let c = getBlock2(new BlockLocation(m(SPlayer.location.x),   m(SPlayer.location.y),   m(SPlayer.location.z)+1));
            let v = getBlock2(new BlockLocation(m(SPlayer.location.x),   m(SPlayer.location.y),   m(SPlayer.location.z)-1));
            let b = getBlock2(new BlockLocation(m(SPlayer.location.x),   m(SPlayer.location.y)+2, m(SPlayer.location.z)));
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

}).structureName("mystructure:test").maxTicks(20*60*10);

world.events.entityHurt.subscribe(ev => {
    const { hurtEntity, damagingEntity, damage } = ev;
     
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

/**
 * 
 * @param { String } name
 * @param { String } message
 * @param { String } [prefix="DEBUG"]
 * @param { Array<Object> } env
 * @param { DEBUG_TYPE } type 
 */
function debug(name, prefix = "DEBUG", message, env = [], type = DEBUG_TYPE.INFO) {
    if(config.debug === true) {
        const T = getJPT();
        let TYPE = `§bINFO`;
        if(type === DEBUG_TYPE.NOTICE)  TYPE = `§3NOTICE`;
        if(type === DEBUG_TYPE.WARNING) TYPE = `§6WARN`;
        
        let E = ``;
        for(let e of env) E+=`§7,${String(e.name).toUpperCase()}=§r${e.valueUpper == true ? String(e.value).toUpperCase() : e.value}`;

        world.say(`§8[§r${T.getHours()}:${T.getMinutes()}:${T.getSeconds()}§8] [${TYPE}§7-§r${prefix}§8] §2${name} §8> §7${message}${E === `` ? "" : `(${E.replace(",","")}§7)`}`);
    }
}

/**
 * 
 * @returns { Date }
 */
function getJPT() {
    let d = new Date();
    d.setHours(d.getHours()+9);
    return d;
}

const DEBUG_TYPE = {
    INFO: 0,
    NOTICE: 1,
    WARNING: 2
}