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
