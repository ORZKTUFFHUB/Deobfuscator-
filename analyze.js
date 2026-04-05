const {SlashCommandBuilder,EmbedBuilder}=require('discord.js');
const axios=require('axios');
const deobfuscator=require('../deobfuscator');
const cooldown=require('../utils/cooldown');

module.exports={
  data:new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('🔍 Analisa o tipo de obfuscação de um script Lua')
    .addStringOption(o=>o.setName('codigo').setDescription('Cole o script aqui').setRequired(false))
    .addAttachmentOption(o=>o.setName('arquivo').setDescription('Envie um arquivo .lua ou .txt').setRequired(false)),

  async execute(interaction){
    const rem=cooldown.check(interaction.user.id,'analyze',8);
    if(rem>0)return interaction.reply({embeds:[errEmbed(`⏳ Aguarde **${rem}s**.`)],ephemeral:true});

    const code=interaction.options.getString('codigo');
    const arquivo=interaction.options.getAttachment('arquivo');
    if(!code&&!arquivo)return interaction.reply({embeds:[errEmbed('Forneça um **código** ou **arquivo**.')],ephemeral:true});

    await interaction.deferReply();
    let input=code||'';

    if(arquivo){
      try{const r=await axios.get(arquivo.url,{timeout:10000,responseType:'text'});input=r.data}
      catch{return interaction.editReply({embeds:[errEmbed('❌ Não consegui baixar o arquivo.')]})}
    }

    const analysis=deobfuscator.analyze(input);
    const hasDetected=analysis.detectedTypes.length>0;

    const embed=new EmbedBuilder()
      .setColor(analysis.hasVM?0xE74C3C:hasDetected?0xFFA500:0x2ECC71)
      .setTitle('🔍 Resultado da Análise')
      .setDescription(hasDetected
        ?`Foram encontradas **${analysis.detectedTypes.length}** técnica(s) de obfuscação.`
        :'✅ Nenhuma obfuscação detectada. O script parece estar em texto limpo.')
      .addFields(
        {name:'🧩 Técnicas Detectadas',value:hasDetected?analysis.detectedTypes.map(t=>`• ${t}`).join('\n'):'Nenhuma',inline:false},
        {name:'📊 Complexidade',value:analysis.complexity,inline:true},
        {name:'🔓 Deobfuscável?',value:analysis.deobfuscable?'✅ Parcial ou total':'❌ Improvável (VM-based)',inline:true},
        {name:'⚠️ VM-Based?',value:analysis.hasVM?'Sim (loadstring/getfenv)':'Não',inline:true},
        {name:'📏 Tamanho',value:`${input.length.toLocaleString()} caracteres`,inline:true},
      )
      .setFooter({text:`Analisado para ${interaction.user.tag}`})
      .setTimestamp();

    await interaction.editReply({embeds:[embed]});
  }
};

function errEmbed(desc){return new EmbedBuilder().setColor(0xE74C3C).setDescription(desc)}
