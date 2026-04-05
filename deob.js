const {SlashCommandBuilder,EmbedBuilder,AttachmentBuilder}=require('discord.js');
const axios=require('axios');
const deobfuscator=require('../deobfuscator');
const cooldown=require('../utils/cooldown');

module.exports={
  data:new SlashCommandBuilder()
    .setName('deob')
    .setDescription('🔓 Deobfusca um script Lua/Roblox')
    .addStringOption(o=>o.setName('codigo').setDescription('Cole o script aqui (até 4000 chars)').setRequired(false))
    .addAttachmentOption(o=>o.setName('arquivo').setDescription('Envie um arquivo .lua ou .txt').setRequired(false)),

  async execute(interaction){
    const rem=cooldown.check(interaction.user.id,'deob',10);
    if(rem>0)return interaction.reply({embeds:[err(`⏳ Aguarde **${rem}s** antes de usar novamente.`)],ephemeral:true});

    const code=interaction.options.getString('codigo');
    const arquivo=interaction.options.getAttachment('arquivo');
    if(!code&&!arquivo)return interaction.reply({embeds:[err('Forneça um **código** ou **arquivo**.')],ephemeral:true});

    await interaction.deferReply();
    let input=code||'';

    if(arquivo){
      if(arquivo.size>512000)return interaction.editReply({embeds:[err('❌ Arquivo muito grande! Máximo: 500KB.')]});
      const valid=['.lua','.txt','.luac'].some(e=>arquivo.name.toLowerCase().endsWith(e));
      if(!valid)return interaction.editReply({embeds:[err('❌ Formato inválido! Use `.lua` ou `.txt`.')]});
      try{const r=await axios.get(arquivo.url,{timeout:10000,responseType:'text'});input=r.data}
      catch{return interaction.editReply({embeds:[err('❌ Não consegui baixar o arquivo.')]})}
    }

    if(input.length>200000)return interaction.editReply({embeds:[err('❌ Script muito grande! Máximo: 200.000 chars.')]});

    const{output,techniquesApplied}=deobfuscator.deobfuscate(input);
    const changed=output!==input;
    const reduction=Math.max(0,Math.round((1-output.length/input.length)*100));

    const embed=new EmbedBuilder()
      .setColor(changed?0x2ECC71:0xE74C3C)
      .setTitle(changed?'✅ Deobfuscação Concluída':'⚠️ Nenhuma mudança detectada')
      .setDescription(changed
        ?`**${techniquesApplied.length}** técnica(s) aplicada(s) com sucesso.`
        :'> O script pode usar obfuscação **VM-based** (Luraph, Ironbrew) resistente à análise automática.')
      .addFields(
        {name:'🔧 Técnicas Aplicadas',value:techniquesApplied.length>0?techniquesApplied.slice(0,10).join('\n'):'Nenhuma',inline:false},
        {name:'📏 Original',value:`${input.length.toLocaleString()} chars`,inline:true},
        {name:'📏 Resultado',value:`${output.length.toLocaleString()} chars`,inline:true},
        {name:'📉 Redução',value:`${reduction}%`,inline:true},
      )
      .setFooter({text:`Solicitado por ${interaction.user.tag}`})
      .setTimestamp();

    if(changed&&output.length<=1800){
      await interaction.editReply({embeds:[embed],content:`\`\`\`lua\n${output.slice(0,1800)}\n\`\`\``});
    } else if(changed){
      const buf=Buffer.from(output,'utf-8');
      await interaction.editReply({embeds:[embed],files:[new AttachmentBuilder(buf,{name:'deobfuscated.lua'})]});
    } else {
      await interaction.editReply({embeds:[embed]});
    }
  }
};

function err(desc){return new EmbedBuilder().setColor(0xE74C3C).setDescription(desc)}
