package com.graru.raworegrinder;

import com.graru.raworegrinder.registry.ModBlocks;
import com.graru.raworegrinder.registry.ModItems;
import com.mojang.logging.LogUtils;
import net.minecraft.world.item.CreativeModeTabs;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import org.slf4j.Logger;

@Mod(RawOreGrinderMod.MOD_ID)
public class RawOreGrinderMod {
    public static final String MOD_ID = "raworegrinder";
    public static final Logger LOGGER = LogUtils.getLogger();

    public RawOreGrinderMod(IEventBus modEventBus) {
        ModBlocks.BLOCKS.register(modEventBus);
        ModItems.ITEMS.register(modEventBus);
        modEventBus.addListener(this::addCreative);
    }

    private void addCreative(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == CreativeModeTabs.FUNCTIONAL_BLOCKS) {
            event.accept(ModItems.RAW_ORE_GRINDER_ITEM);
        }
        if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
            event.accept(ModItems.RAW_DUST);
        }
    }
}
