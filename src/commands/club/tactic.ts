import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { profileService } from "../../services/profileService.js";
import { getTacticInfo, TACTICS_CATALOG, TacticType } from "../../models/tactics.js";
import type { Command } from "../types.js";

export const tacticCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tactic")
    .setDescription("Set your club's tactical playstyle for head-to-head matches")
    .addStringOption((opt) =>
      opt
        .setName("style")
        .setDescription("Choose your tactical playstyle")
        .setRequired(true)
        .addChoices(
          ...Object.values(TACTICS_CATALOG).map((info) => ({
            name: `${info.emoji} ${info.name} - ${info.strengthDesc.slice(0, 45)}`,
            value: info.tacticType,
          }))
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const style = interaction.options.getString("style", true);
    await profileService.setClubTactic(interaction.user.id, style);

    const tInfo = getTacticInfo(style);
    const countersStr = tInfo.counters ? getTacticInfo(tInfo.counters).name : "None";
    const vulnStr = tInfo.vulnerableTo ? getTacticInfo(tInfo.vulnerableTo).name : "None";

    const embed = new EmbedBuilder()
      .setTitle(`${tInfo.emoji} Tactical Identity Set: ${tInfo.name}`)
      .setDescription(
        `**${interaction.user.displayName}**, your club is now drilling **${tInfo.name}**.\n\n` +
          `• **Philosophy:** ${tInfo.description}\n` +
          `• **Tactical Strength:** ${tInfo.strengthDesc}\n` +
          `• **Tactical Weakness:** ${tInfo.weaknessDesc}\n` +
          `• **Counters:** ${countersStr}   •   **Vulnerable To:** ${vulnStr}\n`
      )
      .setColor(0x22c55e)
      .setFooter({ text: "Your tactical choice directly impacts /match calculations." });

    await interaction.editReply({ embeds: [embed] });
  },
};

