import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import { bannerService } from "../../services/bannerService.js";
import type { Command } from "../types.js";

export const bannerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Customize your club with an animated GIF or image banner showcased on /club")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Upload a GIF/image file or provide a direct media URL")
        .addAttachmentOption((opt) =>
          opt
            .setName("file")
            .setDescription("Upload an animated GIF or image file directly from your device")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("url")
            .setDescription("Direct image/GIF URL (e.g. Tenor, Giphy, Imgur, or direct link)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove your custom banner and revert to default tactical pitch")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const user = await economyService.ensureUser(userId, interaction.user.displayName);

    if (subcommand === "remove") {
      await bannerService.removeBanner(userId);

      await interaction.editReply({
        content: "✅ Successfully removed your club banner. Your `/club` overview will now display the tactical pitch layout.",
      });
      return;
    }

    if (subcommand === "set") {
      const file = interaction.options.getAttachment("file");
      const rawUrl = interaction.options.getString("url")?.trim();

      if (!file && !rawUrl) {
        await interaction.editReply({
          content: "❌ Please either **upload a GIF/image file** using the `file` option OR provide a **direct link** using the `url` option.",
        });
        return;
      }

      const mediaSource = file ? file.url : rawUrl!;

      const saveResult = await bannerService.saveBanner(userId, mediaSource);

      if (!saveResult.success || !saveResult.banner) {
        await interaction.editReply({
          content: `❌ ${saveResult.error || "Failed to process and save club banner."}`,
        });
        return;
      }

      const attachment = new AttachmentBuilder(saveResult.banner.filePath, {
        name: saveResult.banner.fileName,
      });

      const previewEmbed = new EmbedBuilder()
        .setTitle(`🎉 Club Banner Updated — ${user.clubName}`)
        .setDescription(
          `Your ${saveResult.banner.isAnimated ? "animated GIF" : "image"} club banner is now active!\n` +
            `Managers inspecting your club with \`/club\` will now see this banner.`
        )
        .setImage(`attachment://${saveResult.banner.fileName}`)
        .setColor(0x22c55e);

      await interaction.editReply({
        embeds: [previewEmbed],
        files: [attachment],
      });
    }
  },
};
