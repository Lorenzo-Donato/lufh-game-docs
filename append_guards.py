import codecs

content = """
## 7. Boas Práticas: Prevenindo "Explosão de Estados" (State Explosion)

Um erro muito comum ao projetar Máquinas de Estados é criar uma nova "caixa" (Estado) para cada pequena variação de uma mecânica. Por exemplo, ao criar o *Wall Dash Jump* (Pulo da Parede com velocidade de Dash), a primeira intuição é desenhar um novo estado chamado `WALL_DASH_JUMP`. 

O problema é que isso gera um efeito dominó: você logo precisaria de um `RUNNING_JUMP`, `WALKING_JUMP`, etc. Isso transforma o diagrama num caos chamado **Explosão de Estados (State Explosion)**. Visualmente e logicamente, o pulo da parede com dash é apenas um "Pulo" (`JUMP`) com uma inércia inicial maior.

### A Solução: Variáveis e Guardas (Guards)
A forma profissional de modelar isso no StateSmith é usar a caixa `$CONFIG : toml` para criar variáveis e dividir as **setas** (transições), não as caixas.

**1. Declare a variável na caixa de Configuração:**
```toml
[RenderConfig]
VariableDeclarations = \"\"\"
    public float vx;
    public float vy;
    public bool isDashHeld; // <--- Declaramos a variável aqui
\"\"\"
```

**2. Use Guardas (Condições) nas setas do Draw.io:**
Em vez de criar uma caixa nova, você puxa **duas setas** saindo do super-estado `WALL_SLIDE` apontando para o estado `JUMP` (no Ar). Ambas reagem ao evento `JUMP_PRESS`, mas executam lógicas diferentes baseadas na *Guarda* (a condição entre colchetes):

* **Seta 1:** `JUMP_PRESS [vars.isDashHeld] / ApplyWallDashJump();`
* **Seta 2:** `JUMP_PRESS [!vars.isDashHeld] / ApplyWallNormalJump();`
*(Nota: O sinal `!` significa negação. Ou seja, se o botão Dash NÃO estiver pressionado).*

**O Resultado:**
O seu diagrama continua elegante, com poucas caixas. O **Contrato Lógico** agora obriga a Game Engine a avisar ao Cérebro se a tecla Dash está pressionada, e aplica o impulso físico correto (músculos) sem sujar a arquitetura da Máquina de Estados!
"""

with codecs.open('ARCHITECTURE.md', 'a', encoding='utf-8') as f:
    f.write(content)
