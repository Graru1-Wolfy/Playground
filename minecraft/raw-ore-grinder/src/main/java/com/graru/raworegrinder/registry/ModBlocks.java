package com.graru.raworegrinder.registry;

import com.graru.raworegrinder.RawOreGrinderMod;
import com.graru.raworegrinder.block.RawOreGrinderBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(RawOreGrinderMod.MOD_ID);

    public static final DeferredBlock<RawOreGrinderBlock> RAW_ORE_GRINDER = BLOCKS.register(
            "raw_ore_grinder",
            () -> new RawOreGrinderBlock(BlockBehaviour.Properties.of()
                    .mapColor(MapColor.METAL)
                    .strength(3.5F, 6.0F)
                    .requiresCorrectToolForDrops()
                    .sound(SoundType.METAL)));

    private ModBlocks() {}
}
