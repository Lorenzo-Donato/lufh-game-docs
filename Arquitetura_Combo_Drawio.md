# 🧩 Arquitetura do Sistema de Combos (HSM)

Aqui está a representação visual da evolução da sua Máquina de Estados para incluir os combos e o ataque carregado. O seu professor vai adorar ver como você estruturou as transições de *Buffering* de ataque.

```mermaid
stateDiagram-v2
    classDef initialState fill:#000,stroke:#000,stroke-width:2px;
    classDef superState fill:#1ba1e2,stroke:#006EAF,color:#fff,stroke-width:2px,font-weight:bold;
    classDef subState fill:#1ba1e2,stroke:#006EAF,color:#fff,stroke-width:1px;
    classDef newState fill:#28a745,stroke:#1e7e34,color:#fff,stroke-width:2px,stroke-dasharray: 5 5;

    state "GROUNDED" as GROUNDED {
        direction TB

        [*] --> IDLE
        
        state "IDLE\nenter / PlayAnim('seq_02_idle');\ndo / ApplyGroundFriction();" as IDLE
        state "RUN\nenter / PlayAnim('seq_07_run');\ndo / ApplyRunVelocity();" as RUN
        state "DASH\nenter / StartDash();\nexit / EndDash();" as DASH
        
        %% Novos estados de combo (Em verde)
        state "ATTACK_1 (Primeiro Hit)\nenter / PlayAnim('seq_17');" as ATTACK_1
        state "ATTACK_2 (Segundo Hit)\nenter / PlayAnim('seq_18');" as ATTACK_2
        state "ATTACK_3 (Terceiro Hit)\nenter / PlayAnim('seq_21');" as ATTACK_3
        state "CHARGE_SLASH (Golpe Forte)\nenter / PlayAnim('seq_20');" as CHARGE_SLASH
        state "ATTACK_DASH\nenter / PlayAnim('seq_27');" as ATTACK_DASH

        %% Lógica Base
        IDLE --> RUN : MOVE_INPUT
        RUN --> IDLE : STOP_INPUT
        RUN --> DASH : DASH_PRESS
        DASH --> RUN : DASH_FINISHED [move]

        %% Gatilhos de Combo
        IDLE --> ATTACK_1 : ATTACK_PRESS
        ATTACK_1 --> ATTACK_2 : ATTACK_PRESS
        ATTACK_2 --> ATTACK_3 : ATTACK_PRESS

        %% Retorno do Combo
        ATTACK_1 --> IDLE : ATTACK_FINISHED
        ATTACK_2 --> IDLE : ATTACK_FINISHED
        ATTACK_3 --> IDLE : ATTACK_FINISHED

        %% Dash Cancel
        ATTACK_1 --> ATTACK_DASH : DASH_PRESS
        ATTACK_2 --> ATTACK_DASH : DASH_PRESS
        DASH --> ATTACK_DASH : ATTACK_PRESS
        ATTACK_DASH --> DASH : ATTACK_FINISHED

        %% Charge Release
        IDLE --> CHARGE_SLASH : CHARGE_RELEASE
        RUN --> CHARGE_SLASH : CHARGE_RELEASE
        CHARGE_SLASH --> IDLE : ATTACK_FINISHED

        class IDLE, RUN, DASH subState
        class ATTACK_1, ATTACK_2, ATTACK_3, CHARGE_SLASH newState
        class ATTACK_DASH subState
    }
    
    class GROUNDED superState
```

### 💡 Dicas para a Defesa do Projeto (Apresentação):
1. **Transições Seguidas (Buffer):** O fato do `ATTACK_1` transicionar para o `ATTACK_2` quando recebe um `ATTACK_PRESS` significa que o jogador não precisa ter reflexos sobre-humanos. Ele pode "esmagar" o botão (button mashing) e a máquina de estados processa a intenção de forma polida.
2. **Caixas Verdes Tracejadas:** Estes são os novos estados que substituem a sua caixa antiga de `ATTACK_IDLE`. Note como o fluxo deles converge perfeitamente de volta para o descanso (`IDLE`).
3. **Desacoplamento do Buster:** Se o professor perguntar por que a pistola (Buster) não está no diagrama, explique o conceito de **"Animação Híbrida / Override Layer"**. Se o Buster fosse adicionado aqui, haveria uma "Explosão Combinatória" de estados (você precisaria duplicar *todos* os estados do jogo só para acomodar o braço atirando). A abordagem que tomamos é a de nível industrial da indústria de games.
