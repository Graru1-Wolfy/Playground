package com.graru.raworegrinder.registry;

import com.graru.raworegrinder.RawOreGrinderMod;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.ItemTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.Item;

public final class ModTags {
    public static final TagKey<Item> GRINDABLE_RAW_ORES = ItemTags.create(
            ResourceLocation.fromNamespaceAndPath(RawOreGrinderMod.MOD_ID, "grindable_raw_ores"));

    private ModTags() {}
}
