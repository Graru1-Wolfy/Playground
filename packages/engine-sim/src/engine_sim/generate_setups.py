"""
    The general idea is that bounce setups are found by
    1. Which launcher to use
    2. Deciding what movement keys to hold down, also if crouched or not
    3. To shoot or jump or both, also includes starting with switching from shotgun + jump
"""

import os


class Setup_data:
    ID = -1 # Done

    launcher = -1 # Done
    start_moving = -1 # Done
    start_action = -1 # Done
    num_rockets = -1 # Done
    tick_delay_auto_bounce = -1 # DONE
    tick_delay_auto_synced_bounce = -1 # DONE
    tick_delay_auto_standing_bounce = -1 # DONE
    tick_delay_auto_synced_standing_bounce = -1 # DONE
    speeds = [] # Done
    
    bounce_flag = 0
    standing_bounce_flag = 0
    
    rocket_fired_crouched_flag = 0
    rocket_hit_crouched_flag = 0

    STOCK = 0 # Done
    ORIG = 0 # Done
    MANG = 0 # Done
    BOUNCE = 0 # DONE
    BHOP = 0 # DONE
    JB = 0 # DONE
    SIMPLE = 0
    CONSIST = 0
    ABOUNCE = 0 # DONE
    ASBOUNCE = 0 # DONE
    ASTANDBOUNCE = 0 # DONE
    ASSTANDBOUNCE = 0 # DONE
    FABOUNCE = 0 # DONE
    FASBOUNCE = 0 # DONE
    FASTANDBOUNCE = 0 # DONE
    FASSTANDBOUNCE = 0 # DONE
    HEIGHT = 0 # DONE
    DIST = 0 # DONE
    SPEED = 0 # DONE
    COMPACT = 0 # DONE
    QUICK = 0 # Done
    STANDBOUNCE = 0
    PB = 0 # DONE
    JBPB = 0 # DONE
    SBOUNCE = 0 # DONE
    SPB = 0 # DONE
    SJBPB = 0 # DONE
    SSTANDBOUNCE = 0 # DONE
    CROUCHED = 0 # DONE
    NOMOVING = 0 # DONE
    DIAGONAL = 0 # DONE
    MOVEUP = 0 # DONE
    STRAFE = 0 # DONE
    NOMOVEMENTBIND = 0 # DONE
    SHOTGUN = 0 # DONE
    ZEROROCKET = 0 # DONE
    ONEROCKET = 0 # DONE
    TWOTHREEROCKETS = 0 # DONE
    JS = 0 # DONE
    JDS = 0 # DONE
    CTAP_JDS = 0 # DONE
    ONETICK = 0 # DONE
    TWOTICK = 0 # DONE
    NOACTIONBIND = 0 # DONE

def try_bounce_setup(floor_heights, make_choice, path_id):
    
    from engine_sim.setups import Setup
    setup = Setup()
    setup.ID = path_id

    from tf2sim import simulation
    from math import sqrt

    from collections import defaultdict
    rocket_positions = defaultdict(list)
    rocket_explosions = {}
    rocket_creation_time = {}
    rockets_shot = []
    player_pos = []
    player_vel = []

    possible_bounces = []
    possible_jumpbugs = []

    last_time_hit_by_rocket = [20]
    last_rocket_hit_by = [-100000]
    last_rocket_shot = [-100000]
    landed_on_final_floor = [-100000]
    last_time_landed = [10000000]

    tick_leaving_first_floor = [1000000]

    class My_hook(simulation.Hook_Base):
        # Record rocket positions, and keep track if they explode
        def rocket_creation(self, rocket):
            print('Update at tick', tick, end = ':\n')
            print('Rocket was created with id', rocket.rocket_id)
            rockets_shot.append(rocket.rocket_id)
            rocket_positions[rocket.rocket_id].append(list(rocket.pos))
            rocket_creation_time[rocket.rocket_id] = tick
            last_rocket_shot[0] = rocket.rocket_id

            if p.b_ducked:
                setup.rocket_fired_crouched_flag |= 1 << (rockets_shot.index(rocket.rocket_id) + 1)
            
        def rocket_after_tick_update(self, rocket):
            rocket_positions[rocket.rocket_id].append(list(rocket.pos))
        def rocket_exploded(self, rocket, explosion_pos):
            rocket_positions[rocket.rocket_id].append(list(explosion_pos))
            rocket_explosions[rocket.rocket_id] = list(explosion_pos)

        def soldier_before_hit(self, p, explosion_dir, modified_damage, explosion_pos, rocket):
            print('Update at tick', tick, end = ':\n')
            print('Player hit by rocket, old hspeed is', sqrt(sum(p.vel[i]**2 for i in range(2))))

            last_time_hit_by_rocket[0] = tick
        
        def soldier_after_hit(self, p, explosion_dir, modified_damage, explosion_pos, rocket):
            print('Update at tick', tick, end = ':\n')
            print('Player hit by rocket, new hspeed is', sqrt(sum(p.vel[i]**2 for i in range(2))), p.vel)
            
            setup.speeds[rockets_shot.index(rocket.rocket_id) + 1] = sqrt(sum(p.vel[i]**2 for i in range(2)))

            print('Current floor is', p.floor.z)
            p.floor = make_choice([floor for floor in floors[floors.index(p.floor):]])
            if tick_leaving_first_floor[0] == 1000000 and p.floor != floors[0]:
                tick_leaving_first_floor[0] = tick
            print('Moving to floor', p.floor.z)
    
            last_rocket_hit_by[0] = rocket.rocket_id

            if p.b_ducked:
                setup.rocket_hit_crouched_flag |= 1 << (rockets_shot.index(rocket.rocket_id) + 1) 
        
        def player_air_to_ground(self, p):
            print('Update at tick', tick, end = ':\n')
            print('Player has landed on floor', p.floor.z)
            last_time_landed[0] = tick
            if p.floor == floors[-1]:
                if landed_on_final_floor[0] < 0:
                    landed_on_final_floor[0] = tick
        
        def player_ground_to_air(self, p):
            print('Update at tick', tick, end = ':\n')
            print('Player became airborne')
            last_time_landed[0] = 1000000000
        
        def player_after_jump(self, p):
            print('Update at tick', tick, end = ':\n')
            print('Player jumped')

            print('Current floor is', p.floor.z)
            p.floor = make_choice([floor for floor in floors[floors.index(p.floor):]])
            if tick_leaving_first_floor[0] == 1000000 and p.floor != floors[0]:
                tick_leaving_first_floor[0] = tick
            print('Moving to floor', p.floor.z)

        # The player could jump bug
        def player_jumpbug_possible(self, p):
            print('Update at tick', tick, end = ':\n')
            print('Player could jump bug')

            if p.floor == floors[-1]:
                possible_jumpbugs.append((tick, list(p.pos)))
        
        # The player hits jump bug
        def player_jumpbug_detected(self, player):
            print('Update at tick', tick, end = ':\n')
            print('Player did a jump bug')

        # Record player positions
        def soldier_created(self, p):
            player_pos.append(list(p.pos))
            player_vel.append(list(p.vel))
        def soldier_after_tick_update(self, p):
            player_pos.append(list(p.pos))
            player_vel.append(list(p.vel))

        def soldier_crouched_bounce_possible(self, p):
            print('Update at tick', tick, end = ':\n')
            print('Player could crouched bounce')

            if p.floor == floors[-1]:
                possible_bounces.append((tick, list(p.pos)))

    my_key_state = simulation.Key_state()

    initial_pos = [.0, .0, -2000.0]
    
    floors = [simulation.Floor(initial_pos[2] - z) for z in floor_heights]
    
    initial_pos = [.0, .0, -2000.0]
    
    first_rocket_fired_at_tick = 20
    number_of_rockets_to_be_fired = make_choice(list(range(7)))
    setup.num_rockets = number_of_rockets_to_be_fired
    setup.speeds = [float('NaN')] * 7

    launchers = [simulation.Stock, simulation.Original, simulation.Mangler]
    
    if number_of_rockets_to_be_fired:
        launcher = make_choice(launchers)
    else:
        launcher = launchers[0]

    setup.launcher = launchers.index(launcher)
    if setup.launcher == 0 or number_of_rockets_to_be_fired == 0:
        setup.STOCK = 128
    if setup.launcher == 1 or number_of_rockets_to_be_fired == 0:
        setup.ORIG = 128
    if setup.launcher == 2 or number_of_rockets_to_be_fired == 0:
        setup.MANG = 128
    print('Using launcher:', launcher)



    p = simulation.Soldier(my_key_state, hook=My_hook(), launcher=launcher, pos = initial_pos, floor = floors[0])
    
    if number_of_rockets_to_be_fired == 0:
        starting_walk = 1
    elif launcher == simulation.Original:
        # Remove symmetries
        bad = [4, 6, 8, 12, 14, 16, 18, 20, 23, 24, 26]
        starting_walk = make_choice([x for x in range(27) if x not in bad])
    else:
        starting_walk = make_choice(list(range(27)))
    
    if number_of_rockets_to_be_fired == 0:
        starting_shot = make_choice([2,3,4])
    else:
        starting_shot = make_choice(list(range(10)))
    setup.start_moving = starting_walk
    setup.start_action = starting_shot

    if number_of_rockets_to_be_fired == 0:
        setup.ZEROROCKET = 128
    elif number_of_rockets_to_be_fired == 1:
        setup.ONEROCKET = 128
    elif 2 <= number_of_rockets_to_be_fired <= 3:
        setup.TWOTHREEROCKETS = 128

    print('number_of_rockets_to_be_fired', number_of_rockets_to_be_fired)
    print('Using starting walk', starting_walk)
    print('Using starting shot', starting_shot)
    
    print('Binds to be used:')

    if starting_shot == 1:
        print('Start crouched.')
        setup.CROUCHED = 128
    
    if starting_shot == 8:
        print('Prefire 1 tick early.')
    if starting_shot == 9:
        print('Prefire 2 tick early.')
    match starting_walk:
        case 0:
            setup.NOMOVEMENTBIND = 255
            setup.NOMOVING = 128
            print('alias +walk "";')
            print('alias -walk "";')
        case 1:
            setup.NOMOVEMENTBIND = 255
            print('alias +walk "+forward";')
            print('alias -walk "-forward -1";')
        case 2:
            setup.NOMOVEMENTBIND = 255
            print('alias +walk "+back";')
            print('alias -walk "-back -1";')
        case 3:
            setup.NOMOVEMENTBIND = 255
            print('alias +walk "+moveleft";')
            print('alias -walk "-moveleft -1";')
        case 4:
            setup.NOMOVEMENTBIND = 255
            print('alias +walk "+moveright";')
            print('alias -walk "-moveright -1";')
        case 5:
            setup.NOMOVEMENTBIND = 128
            setup.DIAGONAL = 128
            print('alias +walk "+forward; +moveleft";')
            print('alias -walk "-forward -1; -moveleft -1";')
        case 6:
            setup.NOMOVEMENTBIND = 128
            setup.DIAGONAL = 128
            print('alias +walk "+forward; +moveright";')
            print('alias -walk "-forward -1; -moveright -1";')
        case 7:
            setup.NOMOVEMENTBIND = 128
            setup.DIAGONAL = 128
            print('alias +walk "+back; +moveleft";')
            print('alias -walk "-back -1; -moveleft -1";')
        case 8:
            setup.NOMOVEMENTBIND = 128
            setup.DIAGONAL = 128
            print('alias +walk "+back; +moveright";')
            print('alias -walk "-back -1; -moveright -1";')
        case 9:
            setup.NOMOVEMENTBIND = 64
            setup.MOVEUP = 128
            print('alias +walk "+moveup; +forward";')
            print('alias -walk "-moveup -1; -forward -1";')
        case 10:
            setup.NOMOVEMENTBIND = 64
            setup.MOVEUP = 128
            print('alias +walk "+moveup; +back";')
            print('alias -walk "-moveup -1; -back -1";')
        case 11:
            setup.NOMOVEMENTBIND = 64
            setup.MOVEUP = 128
            print('alias +walk "+moveup; +moveleft";')
            print('alias -walk "-moveup -1; -moveleft -1";')
        case 12:
            setup.NOMOVEMENTBIND = 64
            setup.MOVEUP = 128
            print('alias +walk "+moveup; +moveright";')
            print('alias -walk "-moveup -1; -moveright -1";')
        case 13:
            setup.NOMOVEMENTBIND = 32
            setup.MOVEUP = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +forward; +moveleft";')
            print('alias -walk "-moveup -1; -forward -1; -moveleft -1";')
        case 14:
            setup.NOMOVEMENTBIND = 32
            setup.MOVEUP = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +forward; +moveright";')
            print('alias -walk "-moveup -1; -forward -1; -moveright -1";')
        case 15:
            setup.NOMOVEMENTBIND = 32
            setup.MOVEUP = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +back; +moveleft";')
            print('alias -walk "-moveup -1; -back -1; -moveleft -1";')
        case 16:
            setup.NOMOVEMENTBIND = 32
            setup.MOVEUP = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +back; +moveright";')
            print('alias -walk "-moveup -1; -back -1; -moveright -1";')
        case 17:
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+forward; +moveleft; +strafe; +left";')
            print('alias -walk "-forward -1; -moveleft -1; -strafe -1; -left -1";')
        case 18:
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+forward; +moveright; +strafe; +right";')
            print('alias -walk "-forward -1; -moveright -1; -strafe -1; -right -1";')
        case 19:
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+back; +moveleft; +strafe; +left";')
            print('alias -walk "-back -1; -moveleft -1; -strafe -1; -left -1";')
        case 20:
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+back; +moveright; +strafe; +right";')
            print('alias -walk "-back -1; -moveright -1; -strafe -1; -right -1";')
        case 21:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +forward; +moveleft; +strafe; +left";')
            print('alias -walk "-moveup -1; -forward -1; -moveleft -1; -strafe -1; -left -1";')
        case 22:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +forward; +moveright; +strafe; +right";')
            print('alias -walk "-moveup -1; -forward -1; -moveright -1; -strafe -1; -right -1";')
        case 23:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +back; +moveleft; +strafe; +left";')
            print('alias -walk "-moveup -1; -back -1; -moveleft -1; -strafe -1; -left -1";')
        case 24:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            setup.DIAGONAL = 128
            print('alias +walk "+moveup; +back; +moveright; +strafe; +right";')
            print('alias -walk "-moveup -1; -back -1; -moveright -1; -strafe -1; -right -1";')
        case 25:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            print('alias +walk "+moveup; +moveleft; +strafe; +left";')
            print('alias -walk "-moveup -1; -moveleft -1; -strafe -1; -left -1";')
        case 26:
            setup.MOVEUP = 128
            setup.STRAFE = 128
            print('alias +walk "+moveup; +moveright; +strafe; +right";')
            print('alias -walk "-moveup -1; -moveright -1; -strafe -1; -right -1";')
    
    match starting_shot:
        case 0:
            setup.NOACTIONBIND = 255
            print('alias +strike "+attack";')
            print('alias -strike "-attack -1";')
        case 1:
            setup.NOACTIONBIND = 255
            print('alias +strike "+attack";')
            print('alias -strike "-attack -1";')
        case 2:
            if number_of_rockets_to_be_fired == 0:
                setup.NOACTIONBIND = 255
            else:
                setup.JS = 128
            print('alias +strike "+attack; +jump; -jump -1";')
            print('alias -strike "-attack -1";')
        case 3:
            if number_of_rockets_to_be_fired == 0:
                setup.NOACTIONBIND = 128
            else:
                setup.JDS = 128
            print('alias +strike "+attack; +jump; -jump -1; +duck";')
            print('alias -strike "-attack -1; -duck -1";')
        case 4:
            if number_of_rockets_to_be_fired == 0:
                setup.NOACTIONBIND = 128
            else:
                setup.CTAP_JDS = 128
            print('alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";')
            print('alias -strike "-attack -1";')
        case 5:
            first_rocket_fired_at_tick += 34
            setup.SHOTGUN = 128
            print('alias +strike "slot1; +attack; +jump; -jump -1";')
            print('alias -strike "-attack -1";')
        case 6:
            first_rocket_fired_at_tick += 34
            setup.SHOTGUN = 128
            print('alias +strike "slot1; +attack; +jump; -jump -1; +duck";')
            print('alias -strike "-attack -1; -duck -1";')
        case 7:
            first_rocket_fired_at_tick += 34
            setup.SHOTGUN = 128
            print('alias +strike "slot1; +attack; +jump; -jump -1; +duck; -duck -1";')
            print('alias -strike "-attack -1";')
        case 8:
            setup.ONETICK = 128
            first_rocket_fired_at_tick -= 1
            print('alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";')
            print('alias -strike "-attack -1";')
        case 9:
            setup.TWOTICK = 128
            first_rocket_fired_at_tick -= 2
            print('alias +strike "+attack; +jump; -jump -1; +duck; -duck -1";')
            print('alias -strike "-attack -1";')
        
    if starting_shot == 1:
        my_key_state.press_key('+duck')

    match starting_walk:
        case 0:
            pass
        case 1:
            my_key_state.press_key('+forward')
        case 2:
            my_key_state.press_key('+back')
        case 3:
            my_key_state.press_key('+moveleft')
        case 4:
            my_key_state.press_key('+moveright')
        case 5:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveleft')
        case 6:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveright')
        case 7:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveleft')
        case 8:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveright')
        case 9:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveup')
        case 10:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveup')
        case 11:
            my_key_state.press_key('+moveleft')
            my_key_state.press_key('+moveup')
        case 12:
            my_key_state.press_key('+moveright')
            my_key_state.press_key('+moveup')
        case 13:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveleft')
            my_key_state.press_key('+moveup')
        case 14:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveright')
            my_key_state.press_key('+moveup')
        case 15:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveleft')
            my_key_state.press_key('+moveup')
        case 16:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveright')
            my_key_state.press_key('+moveup')
        case 17:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveleft', 2.0)
        case 18:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveright', 2.0)
        case 19:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveleft', 2.0)
        case 20:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveright', 2.0)
        case 21:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveleft', 2.0)
            my_key_state.press_key('+moveup')
        case 22:
            my_key_state.press_key('+forward')
            my_key_state.press_key('+moveright', 2.0)
            my_key_state.press_key('+moveup')
        case 23:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveleft', 2.0)
            my_key_state.press_key('+moveup')
        case 24:
            my_key_state.press_key('+back')
            my_key_state.press_key('+moveright', 2.0)
            my_key_state.press_key('+moveup')
        case 25:
            my_key_state.press_key('+moveleft', 2.0)
            my_key_state.press_key('+moveup')
        case 26:
            my_key_state.press_key('+moveright', 2.0)
            my_key_state.press_key('+moveup')

    #for tick in range(406):
    for tick in range(806):
        p.simulate_tick()

        if tick == last_time_hit_by_rocket[0] + 10:
            if make_choice([0,1]):
                my_key_state.press_key('+duck')
            else:
                my_key_state.release_key('+duck')
        
        if tick == 20:
            setup.speeds[0] = sqrt(sum(p.vel[i]**2 for i in range(2)))

            if p.b_ducked:
                setup.rocket_hit_crouched_flag |= 1
                setup.rocket_fired_crouched_flag |= 1
        
        match starting_shot:
            case 0:
                if tick == 20:
                    my_key_state.press_key('+attack')
            case 1:
                if tick == 20:
                    my_key_state.press_key('+attack')
            case 2:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                if tick == 21:
                    my_key_state.release_key('+jump')
            case 3:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                if tick == 21:
                    my_key_state.release_key('+jump')
            case 4:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('+duck')
            case 5:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('shotgun')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('shotgun')
            case 6:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                    my_key_state.press_key('shotgun')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('shotgun')
            case 7:
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                    my_key_state.press_key('shotgun')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('+duck')
                    my_key_state.release_key('shotgun')
            case 8:
                if tick == 19:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('+duck')
            case 9:
                if tick == 18:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                if tick == 20:
                    if number_of_rockets_to_be_fired: my_key_state.press_key('+attack')
                    my_key_state.press_key('+jump')
                    my_key_state.press_key('+duck')
                if tick == 21:
                    my_key_state.release_key('+jump')
                    my_key_state.release_key('+duck')
        
        if tick == 20 + 54 * (number_of_rockets_to_be_fired - 1) + 50:
            my_key_state.release_key('+attack')

        if tick == landed_on_final_floor[0] + 10:
            break
        if tick == last_time_landed[0] + 10 >= 40:
            break

    
    last_tick_exploded_rocket_fired = first_rocket_fired_at_tick + 1
    for rocket_id in rocket_creation_time:
        if rocket_id in rocket_explosions:
            last_tick_exploded_rocket_fired = max(last_tick_exploded_rocket_fired, rocket_creation_time[rocket_id])

    # Require to be hit by last rocket
    print('last rocket',last_rocket_hit_by, last_rocket_shot)
    if last_rocket_hit_by != last_rocket_shot:
        return

    # Require player to "reach" ending floor
    if p.floor != floors[-1]:
        return

    # Require setup to be interesting in some way
    if not possible_bounces and not possible_jumpbugs:
        return

    interesting = False
    if possible_bounces:

        #possible_bounces = possible_bounces[-1:]
        assert len(possible_bounces) == 1
        
        print('BOUNCE POSSIBLE')
        for tick, pos in possible_bounces:
            print('Bounce possible at tick:', tick,'at position:', pos, flush=True)
 
            fully_auto_synced_bounce = 0
            auto_synced_bounce = 0
            synced_bounce = 0
            fully_auto_bounce = 0
            auto_bounce = 0
            bounce = 0
            best_prefire_vspeed_auto_synced_bounce = -1000000
            best_prefire_vspeed_synced_bounce = -1000000
            best_prefire_vspeed_auto_bounce = -1000000
            best_prefire_vspeed_bounce = -1000000

            # Is the prefire crouched (0) or standing (1)
            for prefire in 0,1:

                # Don't allow to uncrouch into crouched bounce if too tight (5 ticks)
                for tmp in range(last_tick_exploded_rocket_fired + 54, tick - 5 * prefire):
                    old_player_pos = list(player_pos[tmp + 1])
                    old_player_pos[2] += 45.0 - 23.5 + (3.0 if prefire else 0.0)
                    old_player_vspeed = player_vel[tmp+1][2]
                    
                    max_dist = sqrt(sum((x - y)**2 for x,y in zip(pos, old_player_pos)))
                    min_dist = old_player_pos[2] - floors[-1].z
                    
                    # Auto sync
                    if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                        print('??????',min_dist/(1100 * 0.015), tick-tmp)
                        print('??????',max_dist/(1100 * 0.015), tick-tmp)
                    if min_dist/(1100.0*0.015) <= tick - tmp <= max_dist/(1100.0*0.015) + 1:
                        if tick - tmp >= 54 - 5:
                            synced_bounce |= 1 << prefire
                            if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                                auto_synced_bounce |= 1 << prefire
                                    
                                delay = (tick - tmp) + int(-min_dist//(1100.0 * 0.015))
                                if delay == 0:
                                    fully_auto_synced_bounce |= 1 << prefire
                                
                                if setup.tick_delay_auto_synced_bounce == -1 or setup.tick_delay_auto_synced_bounce > delay:
                                    setup.tick_delay_auto_synced_bounce = delay
                                
                                best_prefire_vspeed_auto_synced_bounce = min(best_prefire_vspeed_auto_synced_bounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                            else:
                                best_prefire_vspeed_synced_bounce = min(best_prefire_vspeed_synced_bounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                        
                        bounce |= 1 << prefire
                        if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                            auto_bounce |= 1 << prefire
                            
                            delay = (tick - tmp) + int(-min_dist//(1100.0 * 0.015))
                            if delay == 0:
                                fully_auto_bounce |= 1 << prefire
                            
                            if setup.tick_delay_auto_bounce == -1 or setup.tick_delay_auto_bounce > delay:
                                setup.tick_delay_auto_bounce = delay


                            best_prefire_vspeed_auto_bounce = min(best_prefire_vspeed_auto_bounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                        else:
                            best_prefire_vspeed_bounce = min(best_prefire_vspeed_bounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
            
            if fully_auto_synced_bounce:
                match fully_auto_synced_bounce:
                    case 3:
                        print('Fully auto synced bounce potential')
                    case 2:
                        print('Fully auto synced (with standing prefire) bounce potential')
                    case 1:
                        print('Fully auto synced (with crouched prefire) bounce potential')
                setup.FASBOUNCE = 128
                
            if auto_synced_bounce:
                match auto_synced_bounce:
                    case 3:
                        print('Auto synced bounce potential')
                    case 2:
                        print('Auto synced (with standing prefire) bounce potential')
                    case 1:
                        print('Auto synced (with crouched prefire) bounce potential')
                print('Best vspeed:', -best_prefire_vspeed_auto_synced_bounce)
                setup.ASBOUNCE = 128
            
            if synced_bounce:
                match synced_bounce:
                    case 3:
                        print('Synced bounce potential')
                    case 2:
                        print('Synced bounce (with standing prefire) potential')
                    case 1:
                        print('Synced bounce (with crouched prefire) potential')
                print('Best vspeed:', -best_prefire_vspeed_synced_bounce)
                setup.SBOUNCE = 128
            
            if fully_auto_bounce:
                match fully_auto_bounce:
                    case 3:
                        print('Fully auto bounce potential')
                    case 2:
                        print('Fully auto bounce (with standing prefire) potential')
                    case 1:
                        print('Fully auto bounce (with crouched prefire) potential')
                setup.FABOUNCE = 128

            if auto_bounce:
                match auto_bounce:
                    case 3:
                        print('Auto bounce potential')
                    case 2:
                        print('Auto bounce (with standing prefire) potential')
                    case 1:
                        print('Auto bounce (with crouched prefire) potential')
                print('Best vspeed:', -best_prefire_vspeed_auto_bounce)
                setup.ABOUNCE = 128

            if bounce:
                match bounce:
                    case 3:
                        print('Bounce potential')
                    case 2:
                        print('Bounce (with standing prefire) potential')
                    case 1:
                        print('Bounce (with crouched prefire) potential')

                print('Best vspeed:', -best_prefire_vspeed_bounce)
                setup.BOUNCE = 128

            flag = [+bool(bounce), +bool(auto_bounce), fully_auto_bounce, +bool(synced_bounce), +bool(auto_synced_bounce), fully_auto_synced_bounce]
            setup.bounce_flag = flag[0] + (flag[1] << 1) + (flag[2] << 2) + (flag[3] << 4) + (flag[4] << 5) + (flag[5] << 6)

            # If no prefire exists to hit the bounce, then ignore say it is not possible (even though it is in theory)
            if not (bounce or auto_bounce or auto_synced_bounce or synced_bounce):
                possible_bounces = []

   
    if possible_jumpbugs:

        # If many jump bugs are found, pick the last one
        possible_jumpbugs = possible_jumpbugs[-1:]
        assert len(possible_jumpbugs) == 1
        
        print('JUMPBUG POSSIBLE')
        #interesting = True
        for tick, pos in possible_jumpbugs:
            print('Jumpbug possible at tick:', tick,'at position:', pos, flush=True)
            setup.JB = 128

            if pos[2] - floors[-1].z - 20.0 >= 1.0:
                bhopable = True
                uncrouched_pos = list(pos)
                uncrouched_pos[2] -= 20.0
                print('Bhop possible at tick:', tick,'at position:', uncrouched_pos, flush=True)
                setup.BHOP = 128
                #interesting = starting_shot == 9
            else:
                bhopable = False
            
            synced_jb_pb = 0
            jb_pb = 0
           
            # Code handling pb/synced pb/jb/synced jb
            for tmp in range(last_tick_exploded_rocket_fired + 54, tick):
                old_player_pos = list(player_pos[tmp + 1])
                old_player_pos[2] += 45.0 - 23.5
                old_player_vspeed = player_vel[tmp+1][2]
                
                max_dist = sqrt(sum((x - y)**2 for x,y in zip(pos, old_player_pos)))
                min_dist = old_player_pos[2] - floors[-1].z
                
                if min_dist/(1100.0*0.015) <= tick - tmp <= max_dist/(1100.0*0.015) + 1:
                    if tick - tmp >= 54 - 5:
                        synced_jb_pb = True
            
            if last_tick_exploded_rocket_fired + 54 <= tick + 5:
                jb_pb = True


            if bhopable:
                if synced_jb_pb:
                    print('Synced powerbounce potential')
                    setup.SPB = 128
                if jb_pb:
                    print('Power bounce potential')
                    setup.PB = 128

            if synced_jb_pb:
                print('Synced jb powerbounce potential')
                setup.SJBPB = 128
            if jb_pb:
                print('Jb power bounce potential')
                setup.JBPB = 128
            
            # Subtrackt 1 from tick since standing bounce has to happen one tick earlier
            tick -= 1

            fully_auto_synced_sbounce = 0
            auto_synced_sbounce = 0
            synced_sbounce = 0
            fully_auto_sbounce = 0
            auto_sbounce = 0
            sbounce = 0
            best_prefire_vspeed_auto_synced_sbounce = -1000000
            best_prefire_vspeed_synced_sbounce = -1000000
            best_prefire_vspeed_auto_sbounce = -1000000
            best_prefire_vspeed_sbounce = -1000000
            
            if bhopable:
                # Code handling standing bounces / synced standing bounces
                

                # Is the prefire crouched (0) or standing (1)
                for prefire in 0,1:

                    for tmp in range(last_tick_exploded_rocket_fired + 54, tick):
                        old_player_pos = list(player_pos[tmp + 1])
                        old_player_pos[2] += 45.0 - 23.5 + (3.0 if prefire else 0.0)
                        old_player_vspeed = player_vel[tmp+1][2]
                        
                        max_dist = sqrt(sum((x - y)**2 for x,y in zip(pos, old_player_pos)))
                        min_dist = old_player_pos[2] - floors[-1].z
                        
                        # Auto sync
                        if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                            print('??????',min_dist/(1100 * 0.015), tick-tmp)
                            print('??????',max_dist/(1100 * 0.015), tick-tmp)
                        if min_dist/(1100.0*0.015) <= tick - tmp <= max_dist/(1100.0*0.015) + 1:
                            if tick - tmp >= 54 - 5:
                                synced_sbounce |= 1 << prefire
                                if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                                    auto_synced_sbounce |= 1 << prefire
                                    
                                    delay = (tick - tmp) + int(-min_dist//(1100.0 * 0.015))
                                    if delay == 0:
                                        fully_auto_synced_sbounce |= 1 << prefire
                                    
                                    if setup.tick_delay_auto_synced_standing_bounce == -1 or setup.tick_delay_auto_synced_standing_bounce > delay:
                                        setup.tick_delay_auto_synced_standing_bounce = delay


                                    best_prefire_vspeed_auto_synced_sbounce = min(best_prefire_vspeed_auto_synced_sbounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                                else:
                                    best_prefire_vspeed_synced_sbounce = min(best_prefire_vspeed_synced_sbounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                            
                            sbounce |= 1 << prefire
                            if (last_tick_exploded_rocket_fired - tmp) % 54 == 0:
                                auto_sbounce |= 1 << prefire

                                delay = (tick - tmp) + int(-min_dist//(1100.0 * 0.015))
                                if delay == 0:
                                    fully_auto_sbounce |= 1 << prefire
                                
                                if setup.tick_delay_auto_standing_bounce == -1 or setup.tick_delay_auto_standing_bounce > delay:
                                    setup.tick_delay_auto_standing_bounce = delay

                                best_prefire_vspeed_auto_sbounce = min(best_prefire_vspeed_auto_sbounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                            else:
                                best_prefire_vspeed_sbounce = min(best_prefire_vspeed_sbounce, old_player_vspeed, key = lambda x:abs(x - -1100.0))
                
                if fully_auto_synced_sbounce:
                    match fully_auto_synced_sbounce:
                        case 3:
                            print('Fully auto synced standing bounce potential')
                        case 2:
                            print('Fully auto synced standing bounce (with standing prefire) potential')
                        case 1:
                            print('Fully auto synced standing bounce (with crouched prefire) potential')
                    setup.FASSTANDBOUNCE = 128
                
                if auto_synced_sbounce:
                    match auto_synced_sbounce:
                        case 3:
                            print('Auto synced standing bounce potential')
                        case 2:
                            print('Auto synced standing bounce (with standing prefire) potential')
                        case 1:
                            print('Auto synced standing bounce (with crouched prefire) potential')
                    print('Best vspeed:', -best_prefire_vspeed_auto_synced_sbounce)
                    setup.ASSTANDBOUNCE = 128
                
                if synced_sbounce:
                    #interesting = True
                    match synced_sbounce:
                        case 3:
                            print('Synced standing bounce potential')
                        case 2:
                            print('Synced standing bounce (with standing prefire) potential')
                        case 1:
                            print('Synced standing bounce (with crouched prefire) potential')
                    print('Best vspeed:', -best_prefire_vspeed_synced_sbounce)
                    setup.SSTANDBOUNCE = 128
                
                if fully_auto_sbounce:
                    match fully_auto_sbounce:
                        case 3:
                            print('Fully auto standing bounce potential')
                        case 2:
                            print('Fully auto standing bounce (with standing prefire) potential')
                        case 1:
                            print('Fully auto standing bounce (with crouched prefire) potential')
                    setup.FASTANDBOUNCE = 128
                
                if auto_sbounce:
                    match auto_sbounce:
                        case 3:
                            print('Auto standing bounce potential')
                        case 2:
                            print('Auto standing bounce (with standing prefire) potential')
                        case 1:
                            print('Auto standing bounce (with crouched prefire) potential')
                    print('Best vspeed:', -best_prefire_vspeed_auto_sbounce)
                    setup.ASTANDBOUNCE = 128
                
                if sbounce:
                    match sbounce:
                        case 3:
                            print('Standing bounce potential')
                        case 2:
                            print('Standing bounce (with standing prefire) potential')
                        case 1:
                            print('Standing bounce (with crouched prefire) potential')
                    print('Best vspeed:', -best_prefire_vspeed_sbounce)
                    setup.STANDBOUNCE = 128
                
                flag = [+bool(sbounce), +bool(auto_sbounce), fully_auto_sbounce, +bool(synced_sbounce), +bool(auto_synced_sbounce), fully_auto_synced_sbounce]
                setup.standing_bounce_flag = flag[0] + (flag[1] << 1) + (flag[2] << 2) + (flag[3] << 4) + (flag[4] << 5) + (flag[5] << 6)
            

   
    # Compute height weight
    diff = max(z for x,y,z in player_pos) - player_pos[0][2]
    setup.HEIGHT = round(min(1, diff / 700.0) * 255)

    # Set nobind weight to average
    NOBIND = (setup.NOMOVEMENTBIND + setup.NOACTIONBIND) // 2

    # Compute general properties of the setup
    
    t0 = 0.0
    t2 = len(player_pos) - 1
    t1 = min(t2, tick_leaving_first_floor[0] + 10)

    pos0 = player_pos[20]
    pos1 = player_pos[t1]
    pos2 = player_pos[-1]
    vel1 = player_vel[t1]
    hspeed1 = sqrt(sum(vel1[i]**2 for i in range(2)))
    print('hspeed1',hspeed1, t1)

    tmp = sqrt(sum((pos1[i] - pos2[i])**2 for i in range(2)))
    setup.DIST = round(255 - 2**-(tmp/1000.0) * 255)
    setup.SPEED = round(min(1, hspeed1/1400.0) * 255)
    
    tmp = sqrt(sum((pos0[i] - pos1[i])**2 for i in range(2)))
    setup.COMPACT = round(2**-(tmp / 200.0) * 255)
    setup.QUICK = round(2**-((t2 - t0) / 200.0) * 255)
    
    # Compute simple and consitency from previous scores

    complications = [255 - setup.NOACTIONBIND, 255 - NOBIND]
    complications+= [255 - round(255 * 2**-max(0, (number_of_rockets_to_be_fired - 1)/3))] * 10
    complications+= [setup.ONETICK, setup.TWOTICK]
    setup.SIMPLE = max(0, round(255 - sum(complications) / len(complications)))
    
    consistency = [255 - setup.DIAGONAL, setup.FABOUNCE, setup.FASBOUNCE, setup.ABOUNCE, setup.ASBOUNCE, setup.NOMOVING, 255 * 2**-(number_of_rockets_to_be_fired), 255-setup.ONETICK, 255 - setup.TWOTICK]
    setup.CONSIST = min(255, round(sum(consistency) / len(consistency)))
   

    print(setup)
    import sys
    sys.stdout.flush()
    if interesting and (possible_bounces or possible_jumpbugs):
        if os.environ.get("ENGINE_SIM_VISUALIZE") == "1":
            try:
                from tf2sim import visualizer

                visualizer.visualize(player_pos, rocket_positions, rocket_explosions)
            except Exception:
                pass
     
#    if path_id == 163431:
#        exit()

    if (possible_bounces or possible_jumpbugs):

        setup.my_hash = tuple(sorted(z for x,y,z in player_pos))

        return setup


#height = 4504.0 # jump_ricko
#height = 2240.0 # jump_ricko
#height = 992.0 # jump_superserious
#height = 608.0 # jump_simister
#height = 1602.0 # jump_sweet
#height = 604.0 # jump_hanami, lvl 3
#height = 464.0 # jump_hanami, lvl 4
#height = 240.0 # jump_pump
#height = 5082.0 # jump_diabahra, last
#height = 1172.0 # jump_diabahra
#height = 1534.0 # jump_diabahra
#height = 384.0 # jump_aperature, 12
#height = 768.0 # jump_aperature, 13
#height = 1792.0 # jump_speed2 last
#height = 1216.0 # jump_speed2 last
#height = 128.0 # jump_speed2 last


def find_bounce_setups_for_height(height: float, *, data_root=None, precompute_root=None):
    import os

    from engine_sim.explore_code_paths import explore_all_paths, explore_specifc_paths
    from engine_sim.paths import precompute_path, setup_data_path
    from engine_sim.precompute import manage_precompute
    from engine_sim.setups import Setup, export_setups

    def generate_interesting_setup_ids():
        f = lambda make_choice, path_id: try_bounce_setup([0.0, height], make_choice, path_id)
        
        found_setups = {}
        for setup in explore_all_paths(f):
            if type(setup) == Setup:
                if setup.my_hash not in found_setups:
                    found_setups[setup.my_hash] = setup

        from engine_sim.setups import export_setups
        interesting_setups = [found_setups[my_hash] for my_hash in found_setups]

        return [setup.ID for setup in interesting_setups]
    
    def generate_setups_given_ids(setup_ids):
        f = lambda make_choice, path_id: try_bounce_setup([0.0, height], make_choice, path_id)
        
        found_setups = []
        for setup in explore_specifc_paths(f, setup_ids):
            if type(setup) == Setup:
                if setup.my_hash not in found_setups:
                    found_setups.append(setup)

        return found_setups
    
    height_i = int(height)
    interesting_setup_ids = manage_precompute(
        generate_interesting_setup_ids,
        str(precompute_path(height_i, precompute_root)),
    )
    interesting_setups = generate_setups_given_ids(interesting_setup_ids)

    print("Number of setups found: %d at height %d" % (len(interesting_setups), height_i))
    out = export_setups(interesting_setups, height_i, data_root)
    print("Wrote", out)
    return interesting_setups

H = [
4504.0, 
2240.0 ,
992.0 ,
608.0 ,
1602.0 ,
604.0 ,
464.0 ,
240.0 ,
5082.0 ,
1172.0 ,
1534.0 ,
384.0 ,
768.0 ,
1792.0 ,
1216.0 ,
128.0 ,
]

#from explore_code_paths import explore_all_paths, explore_specifc_paths
#from setups import Setup, export_setups
##height = 320.0
##path_id = 190059
#height = 960.0
#path_id = 49589
#f = lambda make_choice, path_id: try_bounce_setup([0.0, height], make_choice, path_id)

#found_setups = []
#for setup in explore_specifc_paths(f, [path_id]):
#    if type(setup) == Setup:
#        if setup.my_hash not in found_setups:
#            found_setups.append(setup)

#heights = H#[928.0, 256.0, 384.0, 128.0, 1408.0, 1792.0, 320.0, 960.0, 1952.0, 2944.0, 3936.0, 4960.0, 2112.0]

#find_bounce_setups_for_height(1091)
#find_bounce_setups_for_height(528)

# CLI entry via engine_sim.cli
#
## It is important to wrap like this, otherwise children will recursively try to create more threads
#if __name__ == '__main__':
#    heights = range(0, 7000)
#    
#    # This launches 10 completely separate Python processes
#    with ProcessPoolExecutor(max_workers=16) as executor:
#        executor.map(find_bounce_setups_for_height, heights)
