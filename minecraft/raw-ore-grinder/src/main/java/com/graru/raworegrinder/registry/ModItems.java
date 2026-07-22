package com.graru.raworegrinder.registry;

import com.graru.raworegrinder.RawOreGrinderMod;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(RawOreGrinderMod.MOD_ID);

    public static final DeferredItem<BlockItem> RAW_ORE_GRINDER_ITEM = ITEMS.registerSimpleBlockItem(
            "raw_ore_grinder",
            ModBlocks.RAW_ORE_GRINDER);

    public static final DeferredItem<Item> RAW_DUST = ITEMS.registerSimpleItem(
            "raw_dust",
            new Item.Properties());

    private ModItems() {}
}
