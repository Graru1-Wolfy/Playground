package com.graru.raworegrinder.block;

import com.graru.raworegrinder.registry.ModItems;
import com.graru.raworegrinder.registry.ModTags;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.ItemInteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

public class RawOreGrinderBlock extends Block {
    private static final ResourceLocation GRIND_ADVANCEMENT =
            ResourceLocation.fromNamespaceAndPath("raworegrinder", "grind");

    public RawOreGrinderBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected ItemInteractionResult useItemOn(
            ItemStack stack,
            BlockState state,
            Level level,
            BlockPos pos,
            Player player,
            InteractionHand hand,
            BlockHitResult hitResult) {
        if (stack.isEmpty() || !stack.is(ModTags.GRINDABLE_RAW_ORES)) {
            return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
        }

        if (level.isClientSide) {
            return ItemInteractionResult.SUCCESS;
        }

        int dustCount = 2 + level.getRandom().nextInt(3);
        ItemStack dustStack = new ItemStack(ModItems.RAW_DUST.get(), dustCount);

        if (!player.getAbilities().instabuild) {
            stack.shrink(1);
        }

        if (!player.addItem(dustStack)) {
            player.drop(dustStack, false);
        }

        level.playSound(null, pos, SoundEvents.GRINDSTONE_USE, SoundSource.BLOCKS, 1.0F, level.getRandom().nextFloat() * 0.1F + 0.9F);
        if (level instanceof ServerLevel serverLevel) {
            serverLevel.sendParticles(
                    ParticleTypes.CRIT,
                    pos.getX() + 0.5D,
                    pos.getY() + 1.0D,
                    pos.getZ() + 0.5D,
                    8,
                    0.2D,
                    0.1D,
                    0.2D,
                    0.05D);
        }

        if (player instanceof ServerPlayer serverPlayer && level.getServer() != null) {
            var holder = level.getServer().getAdvancements().get(GRIND_ADVANCEMENT);
            if (holder != null) {
                serverPlayer.getAdvancements().award(holder, "ground_ore");
            }
        }

        return ItemInteractionResult.CONSUME;
    }
}
