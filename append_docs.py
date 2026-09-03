import codecs

content = """
## 6. Mergulho Profundo: Como as Ações e Sprites se Conectam

Para entender como a teoria vira imagem na tela, precisamos separar o **Mundo C#** (Godot) do **Mundo Javascript** (o Protótipo Web atual).

### O Mundo C# (O Futuro no Godot)
Como visto no item 3, o StateSmith é um "tradutor". Ele não valida as funções. Quando você cria uma seta `JUMP_PRESS / ApplyImpulse();`, o arquivo `PlayerSm.cs` gerado terá:
```csharp
if (evento == "JUMP_PRESS") {
    this.ApplyImpulse(); 
    MudarEstado("JUMP");
}
```
Isso delega a responsabilidade para você. No Godot, você implementará o `ApplyImpulse()` para alterar a física real (ex: `velocidade_Y = -15.0`).

### O Mundo Javascript (O Protótipo Web \`index.html\`)
Como os navegadores web não rodam C#, o arquivo `PlayerSm.cs` está no repositório apenas aguardando a ida para o Godot. Para você jogar **agora** no navegador, o `index.html` contém um Motor Javascript que *imita* a lógica do C#. 

Para tocar as animações, o Javascript usa um **Dicionário (Mapa)** que liga o nome do Estado à pasta de imagens correspondente:

```javascript
const STATE_ANIM_MAP = {
  'IDLE': 'seq_02_idle',
  'RUN': 'seq_07_run',
  'ATTACK_1': 'seq_17_saber_slash_1'
};
```

Quando o evento `ATTACK_PRESS` faz a máquina transitar para `ATTACK_1`, a Engine faz o seguinte:
1. **Consulta:** Olha o dicionário e descobre que `ATTACK_1` = `seq_17_saber_slash_1`.
2. **Prepara:** Chama a função `playSequence('seq_17_saber_slash_1')`, que zera o relógio da animação (`animTimer = 0`) e zera o quadro atual (`animFrame = 0`).
3. **Desenha:** A cada frame (60x por segundo), o Canvas HTML consulta o arquivo `sprites_catalog_full.json` para saber quantas imagens existem nessa pasta, e desenha o `frame_00.png`, `frame_01.png`, etc., na tela.
4. **Finaliza:** Quando o último quadro é desenhado, a própria Engine grita o evento `ATTACK_FINISHED` de volta para a máquina de estados, fazendo o personagem voltar para `IDLE`.
"""

with codecs.open('ARCHITECTURE.md', 'a', encoding='utf-8') as f:
    f.write(content)
