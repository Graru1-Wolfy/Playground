"""
    FLAGS
"""
# Turns on float rounding for possibly more accurate simulation
float_mode = True

"""
    Useful math functions
"""

from math import sqrt

def round_to_nearest_float(x):
    # Rounds a double to closest float representation
    # Should be equivalent to cast to float in C++
    import math
    m,e = math.frexp(x)
    m *= 2**24
    m = round(m)
    m /= 2**24
    return math.copysign(m * 2**e, x)

# SimpleSpline from mathlib/mathlib.h
def simplespline(x):
    return 3 * x**2 - 2 * x**3

def truncate(x, xmin, xmax):
    if x < xmin:
        return xmin
    if xmax < x:
        return xmax
    return x

def remap_val_clamped(value, a, b, c, d):
    # Source RemapValClamped
    if b == a:
        return c if value <= a else d
    t = max(0.0, min(1.0, (value - a) / (b - a)))
    return c + t * (d - c)

# CTFPlayer::DamageForce reference hull volume (48x48x82)
REFERENCE_HULL_VOLUME = 48.0 * 48.0 * 82.0
TF_ROCKET_RADIUS_FOR_RJS = 110.0 * 1.1  # 121.0
TF_DAMAGE_FORCE_SCALE_SELF_SOLDIER_RJ = 10.0
TF_DAMAGE_FORCE_SCALE_SELF_SOLDIER_BADRJ = 5.0
TF_DAMAGE_SCALE_SELF_SOLDIER = 0.60
DAMAGE_FORCE_MAX = 1000.0
FORCE_HULL_SIZE_DUCKED_Z = 55.0

def radius_damage_at_distance(base_damage, radius, distance, half_falloff=False):
    # CTFRadiusDamageInfo::CalculateFalloff + ApplyToEntity distance falloff
    falloff = 0.5 if half_falloff else (base_damage / radius if radius else 1.0)
    return remap_val_clamped(distance, 0.0, radius, base_damage, base_damage * falloff)

def damage_force(size, damage, scale):
    # CTFPlayer::DamageForce
    volume = size[0] * size[1] * size[2]
    if volume <= 0:
        return 0.0
    force = damage * (REFERENCE_HULL_VOLUME / volume) * scale
    return min(force, DAMAGE_FORCE_MAX)

"""
    Constants used for TF2 simulation
"""

tick_duration = 3/200
max_vel = 3500.0
min_angle = -89.0
max_angle =  89.0
jump_speed = 289.0

sv_accelerate = 10.0
sv_airaccelerate = 10.0
sv_friction = 4.0
sv_gravity = 800.0
sv_stopspeed = 100.0
sv_stepsize = 18.0

# client/in_main.cpp
cl_forwardspeed = 450
cl_backspeed = 450
cl_sidespeed = 450
cl_upspeed = 320

flMaxSpeed = 240 # Walking speed of current class

COORD_RESOLUTION = 0.03125 # Used for 'tracing'
AIRSPEEDCAP = 30.0
WISHSPEEDTHR = 100.0 * sv_friction / sv_accelerate # Wishe speeds below this gets boosted
tf_clamp_back_speed_min = 100.0 # Used in check where backward walking is 90% of forward walking
tf_clamp_back_speed = 0.9 # Used in check where backward walking is 90% of forward walking
BUNNYJUMP_MAX_SPEED_FACTOR = 1.2 # Bhop slows you down to 1.2 * walking speed

# Called TF_AIRDUCKED_COUNT in source
AIRDUCK_LIMIT = 2
# Called TF_TIME_TO_DUCK
REDUCK_TIME = 0.3
#Called TIME_TO_DUCK
DUCKING_TIME = 0.2
#Called TIME_TO_UNDUCK
UNDUCKING_TIME = 0.3


"""
    The floor class. An infinite-large plane at a specific z.
    Note: Avoid modifing a Floor-object after it has been created
          since the same object can be used by both rockets and players
"""
class Floor:
    def __init__(self, z):
        self.z = z

"""
    A "key_state"-class.
    This is used to tell what buttons is being pressed at a specific tick.

    Warning: The actual game is inconsistent with the key-state of movement keys on the first 
             tick they are pressed. Seemingly it is random.
             For example, "tick tapping" is only registered about 1 out of 8 times.
"""

available_keys = {
    "+forward", "+back",
    "+moveleft", "+moveright",
    "+moveup", "+movedown",
    "+jump", "+duck",
    "+attack", "+attack2", "shotgun"
    }

class Key_state:
    def __init__(self):
        self.mem = {key:0.0 for key in available_keys}

    def press_key(self, key, value=1.0):
        #  0 if button not pressed (or just released)
        #  0.25 if button is tick tapped
        #  0.5 if button just got pressed
        #  1 if button is held
        # Note: Value only matters for forward, backward, left, right, moveup/down
        assert key in available_keys
        self.mem[key] = value
    
    def press_keys(self, *keys):
        for key in keys:
            self.press_key(key)

    def release_key(self, key):
        self.press_key(key, value=0.0)
    
    def release_keys(self, *keys):
        for key in keys:
            self.release_key(key)

    def __getitem__(self, key):
        return self.mem[key]

"""
    The base hook class
    This lists all available "hooks", i.e.
    functions that are called in specific parts
    of the simulation.

    You can use it both to read values/states, or
    to modify values.

    Note: You are intended to make your own hook-class
          if you want to use this feature. Do not modify
          the base class.
"""

class Hook_Base:
    """
        Available hooks for the Rocket-class
    """
    # Rocket was just created and initalized
    def rocket_creation(self, rocket): pass
    # Rocket told to move forward
    def rocket_before_tick_update(self, rocket): pass
    # Rocket exploded during tick update
    def rocket_exploded(self, rocket, explosion_pos): pass
    # Rocket did not explode during tick update
    def rocket_after_tick_update(self, rocket): pass
    
    """
        Available hooks for the Player-class
    """
    # Player was just created and initalized
    # Note, soldier_created happens after
    def player_created(self, player): pass
    # Player landed, b_on_ground=False -> b_on_ground=True
    def player_air_to_ground(self, player): pass
    # Player unlanded, b_on_ground=True -> b_on_ground=False
    def player_ground_to_air(self, player): pass
    # Player is about to teleport to .03125 units above floor
    def player_before_teleport_to_ground(self, player): pass
    # Player just teleported to .03125 units above floor
    def player_after_teleport_to_ground(self, player): pass
    # Player is experiencing deadstrafe bug while in airmove
    def player_deadstrafe_detected(self, player): pass
    # Player is "ducking" 
    # Note: Refers to being in animation of ducking or unducking
    def player_ducking(self, player): pass
    # Player becomes ducked b_ducked=False -> b_ducked=True
    def player_before_ducked(self, player): pass
    # Player transitioned to ducked
    def player_after_ducked(self, player): pass
    # Player airduck counter increased (uncrouched while in air)
    def player_airduck_counter_increase(self, player): pass
    # Player becomes "unducked" b_ducked=True -> b_ducked=False
    def player_before_unduck(self, player): pass
    # Player just "unducked"
    def player_after_unduck(self, player): pass
    # Player will ctap (i.e. teleport down 20 units and become ducked)
    def player_before_ctap(self, player): pass
    # Player just ctapped (i.e. teleported down 20 units and became ducked)
    def player_after_ctap(self, player): pass
    # Player tick update.
    # Note: Happens before soldier tick update
    def player_before_tick_update(self, player): pass
    def player_after_tick_update(self, player): pass
    # Player is about to jump
    def player_before_jump(self, player): pass
    # Player jumped (+ deaccelerated with .5 * grav * tick_duration)
    def player_after_jump(self, player): pass
    # Player is detected to bunnyhop. This will reduce speed to 1.2 * walking speed
    # Note: As noted in review.txt, this can make the player jump higher
    # because .5 * grav * tick_duration is included in total speed
    def player_before_bunnyhop_detected(self, player): pass
    def player_after_bunnyhop_detected(self, player): pass
    # Player jumped (+ deaccelerated with .5 * grav * tick_duration)
    # Player experiencing friction while on ground
    def player_before_friction(self, player): pass
    def player_after_friction(self, player): pass
    # Player walkmove (i.e. move while grounded)
    def player_before_walkmove(self, player): pass
    def player_after_walkmove(self, player): pass
    # Player airmove (i.e. move while in air)
    def player_before_airmove(self, player): pass
    def player_after_airmove(self, player): pass
    
    # Player is in a position to jumpbug
    def player_jumpbug_possible(self, player): pass
    # Player is in a position to standing bounce (bhop)
    def player_bhop_possible(self, player): pass
    # Player hit a jump bug
    def player_jumpbug_detected(self, player): pass
    # Player hit a bhop
    def player_bhop_detected(self, player): pass
    """
        Available hooks for the Soldier-class
    """
    # Soldier was just created and initalized
    # Note, player_created happens before
    def soldier_created(self, soldier): pass
    # Soldier tick update
    # Note: Happens after player tick update
    def soldier_before_tick_update(self, soldier): pass
    def soldier_after_tick_update(self, soldier): pass
    # Soldier is about to shoot a rocket
    # This is an oppertunity to change angle/launcher/floor
    def soldier_before_shot(self, solder): pass
    def soldier_after_shot(self, soldier): pass
    # Soldier is aiming the rocket towards aim_at
    def soldier_aiming_rocket(self, soldier, aim_at): pass
    # Soldier "switch weapon"
    # Note: No actual weapon is switched in simulator
    # But this delays firing the next rocket to .5 + tick_duration
    # which is same as switching from shotgun -> rocket launcher in-game
    def soldier_before_weapon_switch(self, soldier): pass
    def soldier_after_weapon_switch(self, soldier): pass
    # Soldier was not hit by explosion
    def soldier_outside_explosion(self, soldier, explosion_pos, explosion_damage, explosion_radius, dist_rocket_to_bbox, rocket): pass
    # Soldier is about to be hit by explosion
    # Will gain vel = explosion_dir * modified_damage
    def soldier_before_hit(self, soldier, explosion_dir, modified_damage, explosion_pos, rocket): pass
    # Soldier got hit by explosion
    def soldier_after_hit(self, soldier, explosion_dir, modified_damage, explosion_pos, rocket): pass
    
    # Soldier hit speed shot (hit by rocket same tick as landing)
    def soldier_ss_detected(self, soldier, explosion_dir, modified_damage, explosion_pos, rocket): pass
    # Soldier is in a position to bounce with a rocket
    def soldier_crouched_bounce_possible(self, player): pass
    def soldier_standing_bounce_possible(self, player): pass
    # Soldier was hit by rocket while being between 1.0 and 2.0 units from floor
    def soldier_crouched_bounce_detected(self, soldier, explosion_dir, modified_damage, explosion_pos, rocket): pass
    def soldier_standing_bounce_detected(self, soldier, explosion_dir, modified_damage, explosion_pos, rocket): pass


"""
    The rocket class and the Standard_rocket. Has support for hooking.

    A simple class for keeping track of rockets and 
    doing basic collision checking with an infinitely large floor.
"""

rocket_id = 0 # A unique identified for each rocket
class Rocket:
    def __init__(self, rocket_pos, rocket_vel, floor, hook = None):
        self.pos = rocket_pos
        self.vel = rocket_vel
        self.floor = floor
        self.hook = hook
        
        global rocket_id
        self.rocket_id = rocket_id
        rocket_id += 1

        if self.hook: self.hook.rocket_creation(self)

    def simulate_tick(self):
        if self.hook: self.hook.rocket_before_tick_update(self)
        t = (self.floor.z - self.pos[2]) / self.vel[2]
        speed = sqrt(sum(x**2 for x in self.vel))

        # Hit happens during tick update
        if 0 < t <= tick_duration:
            # From reading review.pdf, I thought this would 
            # be the prpoper collsion code. But it doesn't match in-game
            # Move to 0.03125 units before wall
            t = max(0.0, t - COORD_RESOLUTION / speed)
            explosion_pos = [self.pos[i] + self.vel[i] * t for i in range(3)]

            # CTFBaseRocket::Explode
            # Go 1 extra unit out from plane
            explosion_pos[2] += 1.0

            if self.hook: self.hook.rocket_exploded(self, list(explosion_pos))
            return True, explosion_pos

        for i in range(3):
            self.pos[i] += self.vel[i] * tick_duration

        if float_mode:
            for i in range(3):
                self.pos[i] = round_to_nearest_float(self.pos[i])
        if self.hook: self.hook.rocket_after_tick_update(self)
        return False, None

class Standard_rocket(Rocket):
    explosion_damage = 90.0
    explosion_radius = 121.0
    rj_radius = TF_ROCKET_RADIUS_FOR_RJS
    half_falloff = False
    rocket_speed = 1100.0

class Charged_standard_rocket(Standard_rocket):
    # CTFProjectile_EnergyBall charged RJ radius multiplier
    rj_radius = TF_ROCKET_RADIUS_FOR_RJS * 1.33
    half_falloff = True

"""
    The rocket-launcher classes
"""

class Rocket_launcher:
    offset_up_standing = -3.0
    offset_up_ducked = 8.0
    offset_forward = 23.5
    rocket_type = Standard_rocket

    def rocket_type_for_next_shot(self):
        return self.rocket_type

class Original(Rocket_launcher):
    offset_right = 0.0

class Stock(Rocket_launcher):
    offset_right = 12.0

class Mangler(Rocket_launcher):
    offset_right = 8.0
    charge_seconds = 4.0

    def __init__(self):
        self.charging = False
        self.charge_ticks = 0
        self.pending_fire_charged = False
        self.pending_charged_shot = False

    def tick_charge(self, key_state):
        max_ticks = int(self.charge_seconds / tick_duration)
        if key_state["+attack2"] > 0:
            self.charging = True
            self.charge_ticks += 1
            if self.charge_ticks >= max_ticks:
                self.pending_fire_charged = True
                self.charging = False
        elif self.charging:
            self.pending_fire_charged = True
            self.charging = False
            self.charge_ticks = 0

    def consume_pending_charged_fire(self):
        if not self.pending_fire_charged:
            return False
        self.pending_fire_charged = False
        self.pending_charged_shot = True
        return True

    def rocket_type_for_next_shot(self):
        if self.pending_charged_shot:
            self.pending_charged_shot = False
            return Charged_standard_rocket
        return Standard_rocket

"""
    The player-base class. Has support for hooking.

    This handles most of the source engine movement,
    except for rockets, explosions and switching weapons.

    The physics object that can be interacted with is an
    infinitely large plane. If you want to change which plane
    is used between ticks, then you are intended to make use of hooks.
"""

class Player:
    # TF view/hull vectors (tf_gamerules.cpp g_TFViewVectors)
    hull_min = [-24.0, -24.0, 0.0]
    hull_max = [24.0, 24.0, 82.0]
    duck_hull_min = [-24.0, -24.0, 0.0]
    duck_hull_max = [24.0, 24.0, 62.0]
    view_height_standing = 68.0
    view_height_ducked = 45.0

    def __init__(self, 
            key_state,
            hook = None,
            
            pos = [0., 0., 0.], 
            vel = [0., 0., 0.],
            angle = -89.0, # Look straight down
            b_ducked = False,
            b_ducking = False,
            b_on_ground = False,
            floor = None,
            ceiling_z = None,
            
            forward_2D = [1., 0.],
            right_2D = [0., -1.],
            grip = 1.0,
            b_crop_speed_ducking = False,
            duck_animation = 10.0,
            reduck_timer = 10.0,
            b_prev_tick_duck_pressed = False,
            airduck_counter = 0,
            b_prev_tick_jump_pressed = False
        ):

        self.key_state = key_state
        self.hook = hook
        
        self.pos = list(pos)
        self.vel = list(vel)
        self.angle = angle
        self.b_ducked = b_ducked
        self.b_ducking = b_ducking
        self.b_on_ground = b_on_ground
        self.floor = floor if floor else Floor(self.pos[2])
        self.ceiling_z = ceiling_z
        
        # Teleport player up by 0.03125
        if self.floor.z == self.pos[2]:
            self.pos[2] += COORD_RESOLUTION
        
        self.forward_2D = list(forward_2D)
        self.right_2D = list(right_2D)
        self.grip = grip
        self.b_crop_speed_ducking = b_crop_speed_ducking
        self.duck_animation = duck_animation
        self.reduck_timer = reduck_timer
        self.b_prev_tick_duck_pressed = b_prev_tick_duck_pressed
        self.airduck_counter = airduck_counter
        self.b_prev_tick_jump_pressed = b_prev_tick_jump_pressed

        self.z_eye_offset = self.view_height_ducked if self.b_ducked else self.view_height_standing

        if self.hook: self.hook.player_created(self)

    def set_ground_state(self, value):
        if value:
            if self.hook and not self.b_on_ground: self.hook.player_air_to_ground(self)
            # CGameMovement::SetGroundEntity in shared/gamemovement.cpp
            if not self.b_on_ground:
                if self.hook: self.hook.landed_this_tick = True
                self.vel[2] = 0.0
            self.b_on_ground = True
            self.airduck_counter = 0
        else:
            if self.hook and self.b_on_ground: self.hook.player_ground_to_air(self)
            self.b_on_ground = False
    
    def categorize_position(self):
        # CTFGameMovement::CategorizePosition in tf/tf_gamemovement
        self.grip = 1.0
        if self.vel[2] > 250.0:
            self.set_ground_state(False)
        else:
            if self.b_on_ground:
                if self.pos[2] - self.floor.z < 2.0 + sv_stepsize: # Floor within 2 units + stepsize
                    traced_dist_to_floor = self.pos[2] - (self.floor.z + COORD_RESOLUTION)
                    if self.b_on_ground and traced_dist_to_floor > 0.5 * COORD_RESOLUTION:
                        if self.hook: self.hook.player_before_teleport_to_ground(self)
                        self.pos[2] = self.floor.z + COORD_RESOLUTION
                        if self.hook: self.hook.player_after_teleport_to_ground(self)
                self.set_ground_state(True)
            elif self.pos[2] - self.floor.z < 2.0: # Floor within 2 units
                self.set_ground_state(True)
            else:
                self.set_ground_state(False)
                if self.vel[2] > 0.0:
                    self.grip = 0.25
    
    def _unduck_target_origin(self):
        # CGameMovement::CanUnduck / FinishUnDuck origin computation
        new_origin = list(self.pos)
        if self.b_on_ground:
            for i in range(3):
                new_origin[i] += self.duck_hull_min[i] - self.hull_min[i]
        else:
            hull_stand = [self.hull_max[i] - self.hull_min[i] for i in range(3)]
            hull_duck = [self.duck_hull_max[i] - self.duck_hull_min[i] for i in range(3)]
            for i in range(3):
                new_origin[i] -= hull_stand[i] - hull_duck[i]
        return new_origin

    def _standing_hull_top_z(self, origin):
        return origin[2] + (self.hull_max[2] - self.hull_min[2])

    def _finish_duck_origin_adjust(self):
        # CGameMovement::FinishDuck HACKHACK hull-min offset
        if self.b_on_ground:
            for i in range(3):
                self.pos[i] -= self.duck_hull_min[i] - self.hull_min[i]
        else:
            hull_stand = [self.hull_max[i] - self.hull_min[i] for i in range(3)]
            hull_duck = [self.duck_hull_max[i] - self.duck_hull_min[i] for i in range(3)]
            for i in range(3):
                self.pos[i] += hull_stand[i] - hull_duck[i]

    def can_unduck(self):
        # CGameMovement::CanUnduck — standing hull trace at unduck target
        new_origin = self._unduck_target_origin()
        if self.ceiling_z is not None:
            if self._standing_hull_top_z(new_origin) > self.ceiling_z:
                return False
        if not self.b_on_ground:
            if new_origin[2] < self.floor.z + COORD_RESOLUTION:
                return False
        return True

    def finish_unduck(self):
        # CGameMovement::FinishUnDuck
        self.pos = self._unduck_target_origin()
        if float_mode:
            for i in range(3):
                self.pos[i] = round_to_nearest_float(self.pos[i])
    
    # CGameMovement::SetDuckedEyeOffset
    def set_ducked_eye_offset(self, fraction):
        assert 0.0 <= fraction <= 1.0
        self.z_eye_offset = fraction * self.view_height_ducked + (1.0 - fraction) * self.view_height_standing

    def handle_ducking(self):
        # CGameMovement::ReduceTimers
        self.duck_animation += tick_duration
        self.reduck_timer += tick_duration
        
        # TODO: Add missing update of eye offset here
        #       See CGameMovement::PlayerMove in shared/gamemovement

        b_duck_pressed = self.key_state['+duck'] > 0
        
        # CTFGameMovement::DuckOverrides
        if self.reduck_timer < REDUCK_TIME and self.b_on_ground:
            b_duck_pressed = False

        if self.b_ducked and self.b_ducking:
            b_duck_pressed = False

        if not self.b_on_ground and self.airduck_counter >= AIRDUCK_LIMIT:
            b_duck_pressed = False

        #CTFGameMovement::Duck
        b_duck_just_pressed = b_duck_pressed and not self.b_prev_tick_duck_pressed
        b_duck_just_released = not b_duck_pressed and self.b_prev_tick_duck_pressed
        self.b_prev_tick_duck_pressed = b_duck_pressed

        # CGameMovement::HandleDuckingSpeedCrop
        self.b_crop_speed_ducking = self.b_ducked and self.b_on_ground
        
        if b_duck_pressed:
            #CTFGameMovement::OnDuck
            if b_duck_just_pressed and not self.b_ducked:
                self.duck_animation = 0.0
                self.b_ducking = True
                if self.hook: self.hook.player_ducking(self)

            if self.b_ducking:
                if self.duck_animation > DUCKING_TIME or self.b_ducked or not self.b_on_ground:
                    #CGameMovement::FinishDuck
                    if not self.b_ducked:
                        if self.hook: self.hook.player_before_ducked(self)
                        self.b_ducked = True
                        self.b_ducking = False
                        self.set_ducked_eye_offset(1.0)
                        self._finish_duck_origin_adjust()
                        if self.hook: self.hook.player_after_ducked(self)
                        self.categorize_position()
                else:
                    duck_fraction = simplespline(self.duck_animation / DUCKING_TIME)
                    self.set_ducked_eye_offset(duck_fraction)

        elif self.b_ducked or self.b_ducking:
            #CTFGameMovement::OnUnDuck
            if b_duck_just_released:
                self.reduck_timer = 0.0
                if not self.b_on_ground:
                    self.airduck_counter += 1
                    if self.hook: self.hook.player_airduck_counter_increase(self)
            
            # Weird logic, but this is how tf2 source is coded
            if True or not self.b_on_ground or self.b_ducking:
                if b_duck_just_released:
                    if self.b_ducked:
                        self.duck_animation = 0.0
                    elif self.b_ducking and not self.b_ducked:
                        # Reverse duck animation
                        self.duck_animation = max(0.0, DUCKING_TIME - self.duck_animation) * UNDUCKING_TIME / DUCKING_TIME
                if self.can_unduck():
                    if self.b_ducking or self.b_ducked:
                        if self.duck_animation > UNDUCKING_TIME or not self.b_on_ground:
                            if self.hook and self.b_ducked: self.hook.player_before_unduck(self)
                            was_ducked = self.b_ducked
                            # CGameMovement::FinishUnDuck
                            if not self.b_on_ground:
                                if self.hook and not self.b_ducked:
                                    self.hook.player_before_ctap(self)
                            self.finish_unduck()
                            if not self.b_on_ground:
                                if self.hook and not self.b_ducked:
                                    self.hook.player_after_ctap(self)

                            self.b_ducked = False
                            self.b_ducking = False
                            self.duck_animation = 10.0
                            self.set_ducked_eye_offset(0.0)

                            if self.hook and was_ducked: self.hook.player_after_unduck(self)
                            self.categorize_position()
                        else:
                            self.b_ducking = True
                            duck_fraction = simplespline(1.0 - self.duck_animation / UNDUCKING_TIME)
                            self.set_ducked_eye_offset(duck_fraction)
                elif self.duck_animation > 0.0:
                    self.duck_animation = 0.0
                    self.b_ducked = True
                    self.b_ducking = False
                    self.set_ducked_eye_offset(1.0)
    
    #CGameMovement::PlayerMove
    def simulate_tick(self):
        if self.hook: self.hook.landed_this_tick = False
        if self.hook: self.hook.player_before_tick_update(self)
        # CGameMovement::PlayerMove in shared/gamemovement.cpp
        if False: # TODO should this be false or true? Seems likely false
            self.categorize_position()
        elif self.vel[2] > 250.0:
            self.set_ground_state(False)
        
        if self.hook and 0.0 < self.pos[2] - self.floor.z - 20.0 <= 2.0 and self.b_ducked and self.vel[2] <= 0.0:
            self.hook.player_jumpbug_possible(self)

        if self.hook: was_ducked_and_in_air_initially = self.b_ducked and not self.b_on_ground
        self.handle_ducking()

        # CTFGameMovement::FullWalkMove in tf/tf_gamemovement
        half_grav = sv_gravity * 0.5 * tick_duration

        # CGameMovement::StartGravity in shared/gamemovement.cpp
        # CGameMovement::CheckVelocity in shared/gamemovement.cpp
        self.vel[2] = truncate(self.vel[2] - half_grav, -max_vel, max_vel)
        self.vel[0] = truncate(self.vel[0], -max_vel, max_vel)
        self.vel[1] = truncate(self.vel[1], -max_vel, max_vel)
       
        if self.hook and self.b_on_ground and 1.0 < self.pos[2] - self.floor.z <= 2.0 and not self.b_ducked:
            self.hook.player_bhop_possible(self)
        
        b_jump_pressed = self.key_state['+jump'] > 0
        b_jump_just_pressed = b_jump_pressed and not self.b_prev_tick_jump_pressed
        self.b_prev_tick_jump_pressed = b_jump_pressed
        if b_jump_pressed:
            if not self.b_ducked and b_jump_just_pressed:
                if b_jump_pressed and self.b_on_ground:
                    #CTFGameMovement::CheckJumpButton
                    
                    if not self.b_on_ground:
                        pass
                    else:
                        if self.hook: self.hook.player_before_jump(self)
                        #CTFGameMovement::PreventBunnyJumping in tf/tf_gamemovement
                        speed = sqrt(sum(x**2 for x in self.vel))
                        if speed >= BUNNYJUMP_MAX_SPEED_FACTOR * self.flMaxSpeed:
                            if self.hook: self.hook.player_before_bunnyhop_detected(self)
                            scale = BUNNYJUMP_MAX_SPEED_FACTOR * self.flMaxSpeed / speed
                            self.vel = [x * scale for x in self.vel]
                            if self.hook: self.hook.player_after_bunnyhop_detected(self)
                        
                        self.set_ground_state(False)

                        # This code makes little to no sense, but it is what it is
                        if self.b_ducked or self.b_ducking:
                            self.vel[2] = truncate(              jump_speed - half_grav, -max_vel, max_vel)
                        else:
                            self.vel[2] = truncate(self.vel[2] + jump_speed - half_grav, -max_vel, max_vel)
                        if self.hook: self.hook.player_after_jump(self)

                        if self.hook and was_ducked_and_in_air_initially:
                            self.hook.player_jumpbug_detected(self)
                        if self.hook and 1.0 < self.pos[2] - self.floor.z <= 2.0:
                            self.hook.player_bhop_detected(self)

        if self.b_on_ground:
            self.vel[2] = 0.0
            self.friction()
            if self.hook: self.hook.player_before_walkmove(self)
            self.walkmove()
            if self.hook: self.hook.player_after_walkmove(self)
        else:
            if self.hook: self.hook.player_before_airmove(self)
            self.airmove()
            if self.hook: self.hook.player_after_airmove(self)
 
        self.categorize_position()

        # CGameMovement::FinishGravity in shared/gamemovement.cpp
        self.vel[2] = truncate(self.vel[2] - half_grav, -max_vel, max_vel)
        if self.b_on_ground:
            self.vel[2] = 0
        
        # Check to stop player from going faster than 3500 (could happen as a result of air strafing)
        self.vel[0] = truncate(self.vel[0], -max_vel, max_vel)
        self.vel[1] = truncate(self.vel[1], -max_vel, max_vel)
        
        if self.hook: self.hook.player_after_tick_update(self)

    def get_wish_speed(self):
        # CInput::ComputeForwardMove in client/in_main.cpp
        forward_wish =  cl_forwardspeed * self.key_state['+forward'] - cl_backspeed * self.key_state['+back']
        # CInput::ComputeSideMove in client/in_main.cpp
        side_wish = cl_sidespeed * self.key_state['+moveright'] - cl_sidespeed * self.key_state['+moveleft']
        # CInput::ComputeUpwardMove in client/in_main.cpp
        up_wish = cl_upspeed * self.key_state['+moveup'] - cl_upspeed * self.key_state['+movedown']
      
        # CGameMovement::CategorizePosition shared/gamemovement
        total = sqrt(forward_wish**2 + side_wish**2 + up_wish**2)
        if total > self.flMaxSpeed:
            scale = flMaxSpeed/total
            forward_wish *= scale
            side_wish *= scale
            up_wish *= scale
      
        # CGameMovement::HandleDuckingSpeedCrop in shared/gamemovement
        if self.b_crop_speed_ducking:
            scale = 0.33333333
            forward_wish *= scale
            side_wish *= scale
            up_wish *= scale

        # Note, up_wish is unused after this

        # Change wishvel to use x,y instead of forward,size,up
        wish_2D_vec = [0.0] * 2
        for i in range(2):
            wish_2D_vec[i] += self.forward_2D[i] * forward_wish + self.right_2D[i] * side_wish
        
        wishspeed = sqrt(sum(x**2 for x in wish_2D_vec))
        wish_dir = [x/wishspeed if wishspeed else 0.0 for x in wish_2D_vec]
        return wishspeed, wish_dir

    
    # CGameMovement::Friction in shared/gamemovement
    def friction(self):
        speed = sqrt(sum(x**2 for x in self.vel))
        if speed < 0.1:
            return
        newspeed = max(0.0, speed - sv_friction * self.grip * tick_duration * max(speed, sv_stopspeed))
        self.vel = [x * newspeed/speed for x in self.vel]
    

    # CTFGameMovement::WalkMove in tf/tf_gamemovement
    def walkmove(self):
        wishspeed, wish_dir = self.get_wish_speed()
        speed = sqrt(sum(x**2 for x in self.vel))

        if 0.0 < wishspeed < WISHSPEEDTHR:
            accel = max(speed, sv_stopspeed) * sv_friction / wishspeed + 1.0
        else:
            accel = sv_accelerate
        
        # CGameMovement::Accelerate in shared/gamemovement.cpp
        curspeed = self.vel[0] * wish_dir[0] + self.vel[1] * wish_dir[1]
        if wishspeed > curspeed:
            diff = min(wishspeed - curspeed, accel * wishspeed * tick_duration * self.grip)
            self.vel[0] += diff * wish_dir[0]
            self.vel[1] += diff * wish_dir[1]

        # CTFGameMovement::WalkMove in tf/tf_gamemovement
        newspeed = sqrt(sum(x**2 for x in self.vel))
        if newspeed > self.flMaxSpeed:
            scale = self.flMaxSpeed / newspeed
            self.vel = [x * scale for x in self.vel]
        
        speed = sqrt(sum(x**2 for x in self.vel))
        if tf_clamp_back_speed < 1.0 and speed > tf_clamp_back_speed_min:
            flDot = self.forward_2D[0] * self.vel[0] + self.forward_2D[1] * self.vel[1]
            
            # Player is going backwards
            if flDot < 0:
                # Clamp baclward speed to .9 * walking speed
                newDot = max(flDot, -self.flMaxSpeed * tf_clamp_back_speed) 
                for i in range(2):
                    self.vel[i] += self.forward_2D[i] * (newDot - flDot)
        
                
        # CTFGameMovement::WalkMove in tf/tf_gamemovement
        speed = sqrt(sum(x**2 for x in self.vel))
        if speed < 1.0:
            self.vel = [0.0] * 3
            return
        
        # Homemade float rounding to mimic true tf2 behaviour
        if float_mode:
            for i in range(3):
                self.vel[i] = round_to_nearest_float(self.vel[i])

        for i in range(3):
            self.pos[i] += self.vel[i] * tick_duration
        
        # Homemade float rounding to mimic true tf2 behaviour
        if float_mode:
            for i in range(3):
                self.pos[i] = round_to_nearest_float(self.pos[i])

    # CTFGameMovement::AirMove in tf/tf_gamemovement
    def airmove(self):
        if self.hook and self.grip != 1.0: self.hook.player_deadstrafe_detected(self)
        
        wishspeed, wish_dir = self.get_wish_speed()
        
        # CGameMovement::AirAccelerate in shared/gamemovement
        capped_wishspeed = min(AIRSPEEDCAP, wishspeed) # The minimum is effectively always AIRSPEEDCAP

        curspeed = self.vel[0] * wish_dir[0] + self.vel[1] * wish_dir[1]        

        if capped_wishspeed > curspeed:
            diff = min(capped_wishspeed - curspeed, sv_airaccelerate * wishspeed * tick_duration * self.grip)
            self.vel[0] += diff * wish_dir[0]
            self.vel[1] += diff * wish_dir[1]
        
        # Homemade float rounding to mimic true tf2 behaviour
        if float_mode:
            for i in range(3):
                self.vel[i] = round_to_nearest_float(self.vel[i])
        
        # CGameMovement::TryPlayerMove in shared/gamemovement.cpp
        for i in range(3):
            self.pos[i] += self.vel[i] * tick_duration
        if self.pos[2] < self.floor.z:
            self.pos[2] = self.floor.z + COORD_RESOLUTION
        
        # Homemade float rounding to mimic true tf2 behaviour
        if float_mode:
            for i in range(3):
                self.pos[i] = round_to_nearest_float(self.pos[i])
 
"""
    The solider class (inherits player- base class). Has support for hooking.
    This handles rockets and explosions.
"""

class Soldier(Player):
    flMaxSpeed = 240
    fire_rate = 0.8
    deploy_speed = 0.5
    standing_bounding_box = [48.0, 48.0, 82.0]
    ducked_bounding_box = [48.0, 48.0, 62.0]
    view_height_standing = 68.0
    view_height_ducked = 45.0
    
    def __init__(self, key_state, launcher=Stock(), **kwargs):
        super().__init__(key_state, **kwargs)
        self.hook = kwargs.get('hook', None)
        self.key_state = key_state
        if isinstance(launcher, type):
            launcher = launcher()
        self.launcher = launcher

        self.active_rockets = []
        self.fire_cooldown = 0.0
        
        if self.hook: self.hook.soldier_created(self)

    def shoot_rocket(self):
        if self.hook: self.hook.soldier_before_shot(self)

        at_floor = self.floor

        import math
        theta = self.angle/360 * (2 * math.pi)
       
        # Compute where the player is currently looking
        # This is where the rocket should be aimed at
        view_dir = [.0] * 3
        view_dir[2] = math.sin(theta)
        for i in range(2):
           view_dir[i] = self.forward_2D[i] * math.cos(theta)

        view_pos = list(self.pos)
        view_pos[2] += self.z_eye_offset

        if theta != 0.0:
            dist = (at_floor.z - view_pos[2]) / math.sin(theta)
        else:
            dist = 2000.0

        if dist < 200.0 or dist > 2000.0:
            dist = 2000.0

        aim_at = [.0] * 3
        for i in range(3):
            aim_at[i] = view_pos[i] + view_dir[i] * dist
        
        if self.hook: self.hook.soldier_aiming_rocket(self, list(aim_at))

        # Compute launcher position using maths
        forward = [.0] * 3
        forward[2] = math.sin(theta)
        for i in range(2):
           forward[i] = self.forward_2D[i] * math.cos(theta)

        right = self.right_2D + [.0]

        up = [.0]*3
        up[2] = math.cos(theta)
        for i in range(2):
           up[i] = -self.forward_2D[i] * math.sin(theta)

        launcher_pos = list(view_pos)
        if self.b_ducked:
            up_offset = self.launcher.offset_up_ducked
        else:
            up_offset = self.launcher.offset_up_standing

        for i in range(3):
            launcher_pos[i] += forward[i] * self.launcher.offset_forward + right[i] * self.launcher.offset_right + up[i] * up_offset

        rocket_vel = [aim_at[i] - launcher_pos[i] for i in range(3)]
        rocket_cls = self.launcher.rocket_type_for_next_shot()
        scale = rocket_cls.rocket_speed / sqrt(sum(x**2 for x in rocket_vel))
        rocket_vel = [x * scale for x in rocket_vel]
        
        if self.hook: self.hook.soldier_after_shot(self)
        
        return rocket_cls(launcher_pos, rocket_vel, at_floor, self.hook)

    def simulate_tick(self):
        super().simulate_tick()
        if self.hook: self.hook.soldier_before_tick_update(self)
         
        if self.hook and self.b_on_ground and 1.0 < self.pos[2] - self.floor.z <= 2.0 and self.vel[2] == 0.0: 
            if self.b_ducked: self.hook.soldier_crouched_bounce_possible(self)
            else: self.hook.soldier_standing_bounce_possible(self)
        
        alive_rockets = []
        for rocket in self.active_rockets:
            rocket_exploded, explosion_pos = rocket.simulate_tick()
            if not rocket_exploded:
                alive_rockets.append(rocket)
                continue
            self.simulate_knockback(explosion_pos, rocket.explosion_damage, rocket.explosion_radius, rocket)

        self.active_rockets = alive_rockets
        
        # CTFWeaponBase::Deploy
        self.fire_cooldown -= tick_duration
        if hasattr(self.launcher, "tick_charge"):
            self.launcher.tick_charge(self.key_state)

        # Pretend to switch from shotgun to rocket launcher
        if self.key_state['shotgun'] > 0.0:
            if self.hook: self.hook.soldier_before_weapon_switch(self)
            self.fire_cooldown = max(self.deploy_speed, self.fire_cooldown)
            if self.hook: self.hook.soldier_after_weapon_switch(self)

        charged_fire = (
            hasattr(self.launcher, "consume_pending_charged_fire")
            and self.launcher.consume_pending_charged_fire()
        )
        if charged_fire and self.fire_cooldown <= 0:
            self.fire_cooldown = self.fire_rate
            self.active_rockets.append(self.shoot_rocket())

        # Jumpqol makes sure that rockets are never moved the tick they are created.
        # CTFWeaponBaseGun::PrimaryAttack in tf/tf_weaponbase_gun
        charging = getattr(self.launcher, "charging", False)
        if self.key_state['+attack'] > 0.0 and self.fire_cooldown <= 0 and not charging:
            self.fire_cooldown = self.fire_rate 
            self.active_rockets.append(self.shoot_rocket())
        
        if self.hook: self.hook.soldier_after_tick_update(self)


    def simulate_knockback(self, explosion_pos, explosion_damage, explosion_radius, rocket):
        # CTFPlayer::ApplyPushFromDamage + CTFPlayer::DamageForce
        rj_radius = getattr(rocket, "rj_radius", explosion_radius)
        half_falloff = getattr(rocket, "half_falloff", False)

        center_pos = list(self.pos)
        if self.b_ducked:
            center_pos[2] += 31.0
            bbox = self.ducked_bounding_box
        else:
            center_pos[2] += 41.0
            bbox = self.standing_bounding_box

        bbox_min = [center_pos[i] - bbox[i]/2 for i in range(3)]
        bbox_max = [center_pos[i] + bbox[i]/2 for i in range(3)]

        closet_point = [truncate(explosion_pos[i], bbox_min[i], bbox_max[i]) for i in range(3)]
        dist_rocket_to_bbox = sqrt(sum((closet_point[i] - explosion_pos[i])**2 for i in range(3)))
        
        if dist_rocket_to_bbox > rj_radius:
            if self.hook: self.hook.soldier_outside_explosion(self, explosion_pos, explosion_damage, rj_radius, dist_rocket_to_bbox, rocket)
            return

        dist_rocket_to_center = sqrt(sum((center_pos[i] - explosion_pos[i])**2 for i in range(3)))
        dist_rocket_to_feet = sqrt(sum((self.pos[i] - explosion_pos[i])**2 for i in range(3)))
        d = min(dist_rocket_to_center, dist_rocket_to_feet)

        damage_for_force = radius_damage_at_distance(
            explosion_damage, rj_radius, d, half_falloff=half_falloff
        )
        if not self.b_on_ground:
            damage_for_force *= TF_DAMAGE_SCALE_SELF_SOLDIER

        force_scale = (
            TF_DAMAGE_FORCE_SCALE_SELF_SOLDIER_BADRJ
            if self.b_on_ground
            else TF_DAMAGE_FORCE_SCALE_SELF_SOLDIER_RJ
        )

        if self.b_ducked:
            force_size = [48.0, 48.0, FORCE_HULL_SIZE_DUCKED_Z]
        else:
            force_size = [48.0, 48.0, 82.0]

        impulse = damage_force(force_size, damage_for_force, force_scale)

        explosion_for_dir = list(explosion_pos)
        explosion_for_dir[2] -= 10.0
        impulse_dir = [center_pos[i] - explosion_for_dir[i] for i in range(3)]
        dir_scale = sqrt(sum(x**2 for x in impulse_dir))
        if dir_scale:
            impulse_dir = [x / dir_scale for x in impulse_dir]
        else:
            impulse_dir = [0.0, 0.0, 1.0]
       
        if self.hook: vspeed_before_explosion = self.vel[2]
        if self.hook: self.hook.soldier_before_hit(self, impulse_dir, impulse, explosion_for_dir, rocket)
        for i in range(3):
            self.vel[i] += impulse_dir[i] * impulse
        if self.hook: self.hook.soldier_after_hit(self, impulse_dir, impulse, explosion_for_dir, rocket)
        
        if self.hook:
            hit_ss = self.b_on_ground and self.hook.landed_this_tick and self.vel[2] > 0.0 and vspeed_before_explosion == 0.0
            if hit_ss: self.hook.soldier_ss_detected(self, impulse_dir, impulse, explosion_for_dir, rocket)
        if self.hook and self.b_on_ground and 1.0 < self.pos[2] - self.floor.z <= 2.0 and self.vel[2] > 0.0: 
            if self.b_ducked: self.hook.soldier_crouched_bounce_detected(self, impulse_dir, impulse, explosion_for_dir, rocket)
            else: self.hook.soldier_standing_bounce_detected(self, impulse_dir, impulse, explosion_for_dir, rocket)
