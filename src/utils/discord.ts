import {
  type TextChannel,
  type MessageCreateOptions,
  type Message,
  type User,
  type GuildMember,
} from "discord.js";

export async function safeSendMessage(
  channel: TextChannel,
  options: string | MessageCreateOptions
): Promise<Message | null> {
  try {
    return await channel.send(options);
  } catch (err) {
    console.error("Failed to send message to channel:", err);
    return null;
  }
}

export function resolveMemberMention(userId: string): string {
  return `<@${userId}>`;
}

export function resolveMemberName(userOrMember: User | GuildMember): string {
  if ("displayName" in userOrMember && typeof userOrMember.displayName === "string") {
    return userOrMember.displayName;
  }
  if ("username" in userOrMember) {
    return (userOrMember as User).username;
  }
  return "Manager";
}
