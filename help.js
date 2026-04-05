const {SlashCommandBuilder,EmbedBuilder}=require('discord.js');

module.exports={
  data:new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Lista todos os comandos disponíveis'),

  async execute(interaction){
    const embed=new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔓 Lua Deobfuscator — Comandos')
      .setDescription('Bot profissional para deobfuscar e analisar scripts Lua/Roblox.')
      .addFields(
        {
          name:'/deob',
          value:'Deobfusca um script Lua.\n**Opções:** `codigo` (texto) ou `arquivo` (.lua/.txt)\n**Cooldown:** 10s por usuário',
          inline:false,
        },
        {
          name:'/analyze',
          value:'Analisa quais técnicas de obfuscação foram usadas sem modificar o script.\n**Opções:** `codigo` ou `arquivo`\n**Cooldown:** 8s por usuário',
          inline:false,
        },
        {
          name:'/help',
          value:'Mostra esta mensagem.',
          inline:false,
        },
      )
      .addFields({
        name:'⚠️ Limitações',
        value:'Scripts com obfuscação **VM-based** (Luraph, Ironbrew, PSU) têm suporte parcial. O bot detecta e tenta reverter camadas externas.',
        inline:false,
      })
      .addFields({
        name:'🔧 Técnicas Suportadas',
        value:'Hex/Decimal Escapes • string.char() • Byte Tables • Base64 • XOR • Matemática constante • Variáveis obfuscadas • Wrappers inline • loadstring • Concatenação',
        inline:false,
      })
      .setFooter({text:'Lua Deobfuscator Bot • Use com responsabilidade'})
      .setTimestamp();

    await interaction.reply({embeds:[embed],ephemeral:false});
  }
};
