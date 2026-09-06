import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const lineupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("lineup")
    .setDescription("Customize your club's Starting 5 lineup and appoint your Head Coach"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const inventory = await economyService.getInventory(interaction.user.id);
    const footballers = inventory.filter((c) => c.position !== "MGR");
    const managers = inventory.filter((c) => c.position === "MGR");
    const activeManager = await economyService.getAssignedManager(interaction.user.id);

    if (footballers.length < 5) {
      await interaction.editReply({
        content: `❌ You need at least 5 footballer cards in your inventory to configure a starting lineup (You have **${footballers.length} footballers**).\nCollect cards with \`/daily\`, \`/dailyshop\`, \`/pack\`, or \`/market\`.`,
      });
      return;
    }

    const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    // 1. Starting 5 Footballers Dropdown
    const playerOptions = footballers.slice(0, 25).map((c) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${c.name.slice(0, 25)} (${c.rating} ${c.position})`)
        .setDescription(`${c.club.slice(0, 20)} • ${c.nation.slice(0, 20)}`)
        .setValue(c.id)
    );

    const playerMenu = new StringSelectMenuBuilder()
      .setCustomId("lineup_select_5")
      .setPlaceholder("⚽ Select exactly 5 footballers for Starting Lineup")
      .setMinValues(5)
      .setMaxValues(5)
      .addOptions(playerOptions);

    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(playerMenu));

    // 2. Head Coach / Manager Dropdown (if user owns managers)
    if (managers.length > 0) {
      const managerOptions = managers.slice(0, 25).map((m) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${m.name.slice(0, 25)} (${m.rating} MGR)`)
          .setDescription(`${m.club.slice(0, 20)} • ${m.nation.slice(0, 20)}`)
          .setValue(m.id)
          .setDefault(activeManager?.id === m.id)
      );

      const managerMenu = new StringSelectMenuBuilder()
        .setCustomId("lineup_select_manager")
        .setPlaceholder(
          activeManager ? `👔 Current Coach: ${activeManager.name} (${activeManager.rating} MGR)` : "👔 Appoint a Head Coach / Manager"
        )
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(managerOptions);

      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(managerMenu));
    }

    const coachStatus = activeManager
      ? `👔 **Active Head Coach:** **${activeManager.name}** (\`${activeManager.rating} MGR\` — *${activeManager.club}*)`
      : `👔 **Active Head Coach:** *None (Sign a manager in \`/dailyshop\` or \`/pack\`!)*`;

    await interaction.editReply({
      content:
        `📋 **Club Roster & Starting 5 Lineup Editor**\n` +
        `${coachStatus}\n\n` +
        `• **Starting 5:** Select exactly 5 footballers below.\n` +
        `• **Head Coach:** ${managers.length > 0 ? "Select your tactical manager below." : "*Acquire managers from `/dailyshop` or `/pack` to appoint.*"}\n` +
        `*Formation Rules: Exactly 1 GK, and 1-2 DEF, 1-2 MID, 1-2 FW.*`,
      components,
    });
  },
};


