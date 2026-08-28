# Arquitetura e Fluxo do Motor de Estados (StateSmith + Game Engine)

Esta documentação explica de cabo a rabo como o ecossistema do seu repositório funciona, qual o papel de cada arquivo e como a lógica visual desenhada se transforma em um código jogável.

---

## 1. A Visão Macro: Separando o "Cérebro" dos "Músculos"

A regra de ouro que seu professor mencionou ("programar sem pensar é escrever bugs") é o motivo pelo qual usamos a arquitetura de **Hierarchical State Machines (HSM)**.
Em vez de programar o personagem escrevendo dezenas de `if` e `else` diretamente no motor de jogo (Godot ou Javascript), nós dividimos o personagem em duas partes:

1. **O Cérebro (Lógica pura):** Desenvolvido no `Draw.io` e traduzido para código (C#) pelo `StateSmith`. Ele só sabe *em que estado o personagem está* e *para qual estado ele vai* quando um evento ocorre.
2. **Os Músculos e Olhos (A Game Engine):** O arquivo `index.html` (ou o futuro Godot). É ele quem desenha na tela, calcula colisões, lida com botões apertados e obedece às ordens do "Cérebro".

---

## 2. Anatomia do Repositório (O que cada arquivo faz)

### `PlayerSm.drawio`
* **O que é:** O Código-Fonte visual. A fonte da verdade.
* **O que faz:** É aqui que você programa. As caixas coloridas são os **Estados**, as setas são as **Transições**, e os textos nas setas são os **Eventos/Gatilhos** (ex: `JUMP_PRESS`).
* **Detalhe de Ouro:** O StateSmith não entende desenho; ele lê o XML por trás do Draw.io para extrair a lógica.

### `PlayerSm.cs`
* **O que é:** O Cérebro compilado.
* **O que faz:** É um arquivo C# 100% gerado automaticamente pelo StateSmith baseado no seu Draw.io. **Você nunca deve editar este arquivo manualmente**. Se você mudar o Draw.io e recompilar, suas mudanças manuais aqui seriam apagadas. No Godot, este é o arquivo que você vai anexar ao seu personagem.

### `PlayerSm.sim.html`
* **O que é:** O Simulador Lógico.
* **O que faz:** É gerado pelo StateSmith para você testar se os "fios não estão em curto". Ele mostra botões clicáveis para os eventos e diz para onde a máquina foi. Ele **não tem gráficos nem física**, testa apenas a Matemática pura do Draw.io.

### `index.html`
* **O que é:** O Protótipo da Game Engine (Sandbox Web).
* **O que faz:** Lê seu teclado, desenha os sprites e calcula a física (gravidade, inércia).
* **Nota importante:** Como o StateSmith neste projeto está configurado para cuspir **C#** (pensando no Godot), o navegador web não entende C#. Por isso, o `index.html` contém uma *cópia em Javascript* da máquina de estados que criamos, feita para permitir que você teste a física e a arte no navegador antes de ir para o Godot.

### `Dockerfile` & `docker-compose.yml`
* **O que é:** O Ambiente de Desenvolvimento Blindado.
* **O que faz:** Configura um mini-computador virtual (Container) que já tem o pacote `.NET` e a CLI do `StateSmith` instalados, além de um servidor web (Python) na porta 8000 para hospedar o `index.html`. Isso garante que o projeto rode em qualquer PC (Windows, Mac, Linux) sem precisar instalar nada além do Docker.

---

## 3. Entendendo a Sintaxe: De onde vem o `PlayAnim()` e as Variáveis?

Essa é a grande sacada de como o Draw.io se comunica com o C#.

### A Configuração (`$CONFIG : toml`)
No seu Draw.io, existe uma caixa especial de configuração. Nela está escrito:
```toml
[RenderConfig]
VariableDeclarations = """
public float vx;
public float vy;
public bool isGrounded;
"""
```
**O que acontece:** Quando o StateSmith lê isso, ele cria essas variáveis reais no arquivo `PlayerSm.cs`. É por isso que você pode usar `[vars.vy > 0]` (se a velocidade Y for positiva, está caindo) diretamente no desenho do Draw.io como uma condição (Guarda) para mudar de estado!

### Ações (`enter / PlayAnim("seq_02_idle")`)
Você me perguntou: *De onde sai isso?*
**Resposta:** Isso não existe previamente em lugar nenhum! É uma ação genérica que você inventou no Draw.io.
O StateSmith funciona através do conceito de **Delegação de Ações**. Quando ele lê `enter / PlayAnim("seq_02_idle");` no diagrama, ele vai lá no C# gerado e escreve:
```csharp
public void enter_IDLE() {
    this.PlayAnim("seq_02_idle"); // O StateSmith simplesmente cospe o que você escreveu!
}
```
Como a função `PlayAnim` não existe dentro do Cérebro, se você tentar rodar no Godot, vai dar erro de compilação dizendo *"PlayAnim não existe"*.
**Como resolvemos isso?** 
Na caixa de configuração do Draw.io, nós ativamos `UsePartialClass = true`. Isso permite que você crie um **segundo arquivo C#** no Godot (ex: `PlayerSm.Controller.cs`) onde você define os "Músculos":
```csharp
public partial class PlayerSm {
    // Aqui você programa o que a ação inventada realmente faz na Engine!
    public void PlayAnim(string animName) {
        meuNodeGodot.Play(animName);
    }
}
```

---

## 4. O Fluxo de Trabalho (O Ciclo de Vida do Desenvolvimento)

1. **PENSAR (Draw.io):** Você decide que o personagem precisa de um Pulo Duplo. Você desenha um estado `DOUBLE_JUMP` no Draw.io, puxa a seta de `JUMP` para `DOUBLE_JUMP` com o evento `JUMP_PRESS`.
2. **GERAR (StateSmith CLI):** Você roda `ss.cli run --here --lang CSharp`. Ele lê o XML do desenho e atualiza o `PlayerSm.cs`.
3. **TESTAR LÓGICA (Simulador):** Abre o `PlayerSm.sim.html`, aperta o botão JUMP_PRESS duas vezes e vê se a caixa `DOUBLE_JUMP` acende.
4. **INTEGRAR (Godot / index.html):** Como você criou um estado novo, o C# agora vai mandar executar `enter_DOUBLE_JUMP`. Na engine, você diz o que isso fisicamente significa (tocar a cambalhota dupla, aplicar força Y para cima).

## 5. Racionais das Decisões de Arquitetura

* **Por que Super-Estados (Hierarquia)?**
  Em jogos clássicos, dezenas de transições se repetem. Se você puder pular enquanto corre, enquanto está idle, e enquanto bate, sem hierarquia você desenharia 3 setas de Pulo. Colocando tudo isso dentro do Super-Estado `GROUNDED`, você puxa apenas **uma seta** saindo da borda do `GROUNDED` apontando para `AIRBORNE`. Limpo, escalável e impossível de causar bugs esquecendo uma seta.
* **Por que Leniência (Input Buffer) no Motor e não no Draw.io?**
  Leniência (ex: pular 10ms depois do Dash e ainda assim valer como Dash Jump) foi programada no `index.html` e não no Draw.io. Isso preserva a lógica Matemática do Cérebro (no Cérebro, pulo é pulo). Deixamos as imperfeições humanas (atraso no teclado) serem tratadas na porta de entrada da Engine.

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

## 7. Boas Práticas: Prevenindo "Explosão de Estados" (State Explosion)

Um erro muito comum ao projetar Máquinas de Estados é criar uma nova "caixa" (Estado) para cada pequena variação de uma mecânica. Por exemplo, ao criar o *Wall Dash Jump* (Pulo da Parede com velocidade de Dash), a primeira intuição é desenhar um novo estado chamado `WALL_DASH_JUMP`. 

O problema é que isso gera um efeito dominó: você logo precisaria de um `RUNNING_JUMP`, `WALKING_JUMP`, etc. Isso transforma o diagrama num caos chamado **Explosão de Estados (State Explosion)**. Visualmente e logicamente, o pulo da parede com dash é apenas um "Pulo" (`JUMP`) com uma inércia inicial maior.

### A Solução: Variáveis e Guardas (Guards)
A forma profissional de modelar isso no StateSmith é usar a caixa `$CONFIG : toml` para criar variáveis e dividir as **setas** (transições), não as caixas.

**1. Declare a variável na caixa de Configuração:**
```toml
[RenderConfig]
VariableDeclarations = """
    public float vx;
    public float vy;
    public bool isDashHeld; // <--- Declaramos a variável aqui
"""
```

**2. Use Guardas (Condições) nas setas do Draw.io:**
Em vez de criar uma caixa nova, você puxa **duas setas** saindo do super-estado `WALL_SLIDE` apontando para o estado `JUMP` (no Ar). Ambas reagem ao evento `JUMP_PRESS`, mas executam lógicas diferentes baseadas na *Guarda* (a condição entre colchetes):

* **Seta 1:** `JUMP_PRESS [vars.isDashHeld] / ApplyWallDashJump();`
* **Seta 2:** `JUMP_PRESS [!vars.isDashHeld] / ApplyWallNormalJump();`
*(Nota: O sinal `!` significa negação. Ou seja, se o botão Dash NÃO estiver pressionado).*

**O Resultado:**
O seu diagrama continua elegante, com poucas caixas. O **Contrato Lógico** agora obriga a Game Engine a avisar ao Cérebro se a tecla Dash está pressionada, e aplica o impulso físico correto (músculos) sem sujar a arquitetura da Máquina de Estados!
