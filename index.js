const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
});

const prefix = '!';
const blacklistPath = './blacklist.json';
const blacklistedRoleID = '1132703072557219972'; // Replace 'YOUR_ROLE_ID' with the ID of the role you want to give to blacklisted users

client.once('ready', () => {
  console.log('Bot is online!');
});

client.on('messageCreate', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    const helpEmbed = new MessageEmbed()
      .setTitle('Available Commands')
      .setDescription(`
        **${prefix}blacklist add <userID> <reason>** - Add a user to the blacklist.
        **${prefix}blacklist remove <userID>** - Remove a user from the blacklist.
        **${prefix}check <userID>** - Check if a user is on the blacklist.
      `)
      .setColor('#3498db') 
      .setFooter('Example: !blacklist add @test Spamming')
      .setTimestamp();

    message.channel.send({ embeds: [helpEmbed] });
  } else if (command === 'blacklist') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      const noPermissionEmbed = new MessageEmbed()
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');

      return message.channel.send({ embeds: [noPermissionEmbed] });
    }

    const subcommand = args.shift().toLowerCase();
    if (subcommand === 'add') {
      const userID = args[0]?.replace(/[<@!>]/g, ''); // Extracts the user ID from the mention format if provided
      const reason = args.slice(1).join(' ');

      if (!userID || !reason) {
        const invalidEmbed = new MessageEmbed()
          .setDescription('Invalid command format. Usage: !blacklist add <@mention> <reason>')
          .setColor('#ff0000');

        return message.channel.send({ embeds: [invalidEmbed] });
      }

      addToBlacklist(userID, reason);
      logAction(`User ${userID} added to the blacklist with reason: ${reason}`, message.author);
      const successEmbed = new MessageEmbed()
        .setDescription(`User ${userID} has been blacklisted with reason: ${reason}`)
        .setColor('#00ff00');

      message.channel.send({ embeds: [successEmbed] });
    } else if (subcommand === 'remove') {
      const userID = args[0]?.replace(/[<@!>]/g, ''); // Extracts the user ID from the mention format if provided

      if (!userID) {
        const invalidEmbed = new MessageEmbed()
          .setDescription('Invalid command format. Usage: !blacklist remove <userID>')
          .setColor('#ff0000');

        return message.channel.send({ embeds: [invalidEmbed] });
      }

      removeFromBlacklist(userID);
      logAction(`User ${userID} removed from the blacklist.`, message.author);
      const successEmbed = new MessageEmbed()
        .setDescription(`User ${userID} has been removed from the blacklist.`)
        .setColor('#00ff00');

      message.channel.send({ embeds: [successEmbed] });
    } else {
      const invalidEmbed = new MessageEmbed()
        .setDescription('Invalid subcommand. Usage: !blacklist add <userID> <reason> OR !blacklist remove <userID>')
        .setColor('#ff0000');

      message.channel.send({ embeds: [invalidEmbed] });
    }
  } else if (command === 'check') {
    const userID = args[0]?.replace(/[<@!>]/g, ''); // Extracts the user ID from the mention format if provided

    if (!userID) {
      const invalidEmbed = new MessageEmbed()
        .setDescription('Invalid command format. Usage: !check <userID>')
        .setColor('#ff0000');

      return message.channel.send({ embeds: [invalidEmbed] });
    }

    if (isUserBlacklisted(userID)) {
      const userBlacklistedEmbed = new MessageEmbed()
        .setDescription(`User ${userID} is on the blacklist.`)
        .setColor('#ff0000');

      message.channel.send({ embeds: [userBlacklistedEmbed] });
    } else {
      const userNotBlacklistedEmbed = new MessageEmbed()
        .setDescription(`User ${userID} is not on the blacklist.`)
        .setColor('#00ff00');

      message.channel.send({ embeds: [userNotBlacklistedEmbed] });
    }
  }
});

function logAction(action, user) {
  const logChannelID = '1131571163550728273'; // Replace 'YOUR_LOG_CHANNEL_ID' with the ID of your log channel
  const logChannel = client.channels.cache.get(logChannelID);
  if (logChannel) {
    const logEmbed = new MessageEmbed()
      .setTitle('Action Log')
      .setDescription(action)
      .addField('User', `${user.tag} (${user.id})`)
      .setColor('#3498db')
      .setTimestamp();

    if (logEmbed.length > 0) {
      logChannel.send({ embeds: [logEmbed] })
        .catch(error => console.error('Failed to send log message:', error));
    } else {
      console.error('Log embed is empty.');
    }
  } else {
    console.error('Log channel not found.');
  }
}

function addToBlacklist(userID, reason) {
    let blacklist = getBlacklist();
    blacklist[userID] = reason;
    saveBlacklist(blacklist);
  
    const guild = client.guilds.cache.get('1131571102682984489'); // Replace 'YOUR_GUILD_ID' with your actual guild ID
  
    if (guild && blacklistedRoleID) {
      try {
        const member = guild.members.cache.get(userID);
        const blacklistedRole = guild.roles.cache.get(blacklistedRoleID);
        if (blacklistedRole && member) {
          member.roles.add(blacklistedRole)
            .catch(error => console.error(`Failed to add role to the user: ${error}`));
          console.log(`User ${member.user.tag} (${member.user.id}) has been blacklisted with reason: ${reason}`);
        } else {
          console.error('Failed to find member or blacklisted role.');
        }
      } catch (error) {
        console.error('Error while adding role to the user:', error);
      }
    }
  }
  
  function removeFromBlacklist(userID) {
    let blacklist = getBlacklist();
    delete blacklist[userID];
    saveBlacklist(blacklist);
  
    const guild = client.guilds.cache.get('1131571102682984489'); // Replace 'YOUR_GUILD_ID' with your actual guild ID
  
    if (guild && blacklistedRoleID) {
      try {
        const member = guild.members.cache.get(userID);
        const blacklistedRole = guild.roles.cache.get(blacklistedRoleID);
        if (blacklistedRole && member) {
          member.roles.remove(blacklistedRole)
            .catch(error => console.error(`Failed to remove role from the user: ${error}`));
          console.log(`User ${member.user.tag} (${member.user.id}) has been removed from the blacklist.`);
        } else {
          console.error('Failed to find member or blacklisted role.');
        }
      } catch (error) {
        console.error('Error while removing role from the user:', error);
      }
    }
  }
  
  function isUserBlacklisted(userID) {
    let blacklist = getBlacklist();
    return blacklist.hasOwnProperty(userID);
  }
  
  function getBlacklist() {
    if (!fs.existsSync(blacklistPath)) {
      return {};
    }
  
    const data = fs.readFileSync(blacklistPath);
    return JSON.parse(data);
  }
  
  function saveBlacklist(blacklist) {
    fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2));
  }




client.login('MTEyNjQ3ODI5MTM0ODUwNDU4OA.GM7PBN.1-jfYduCeUVmjxiF6ERsG5ldqSYjx2JKyCZY_U');
