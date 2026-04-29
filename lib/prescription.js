export const goalLabels = {
  emagrecimento: "Emagrecimento",
  hipertrofia: "Hipertrofia",
  condicionamento: "Condicionamento",
  saude: "Saude e qualidade de vida",
};

const experienceVolume = {
  iniciante: "2 a 3 series por exercicio, com foco total em tecnica e regularidade.",
  intermediario: "3 a 4 series por exercicio, com progressao de carga e controle de esforco.",
  avancado: "4 a 5 series nos exercicios principais, com gestao mais estrategica do volume.",
};

const equipmentStyles = {
  casa: "priorizando padroes com peso corporal, isometrias, variacoes unilaterais e caminhada",
  basico: "com halteres, minibands, elasticos e exercicios de solo bem organizados",
  academia: "com exercicios basicos, maquinas e acessorios para modular melhor a carga",
};

const exerciseLibrary = {
  squat: {
    academia: { name: "Agachamento goblet ou livre", fallback: "Leg press", notes: "Amplitude confortavel, coluna neutra e controle na descida." },
    basico: { name: "Agachamento goblet com halter", fallback: "Agachamento com miniband", notes: "Segurar carga proxima ao tronco e manter joelhos alinhados." },
    casa: { name: "Agachamento para banco", fallback: "Agachamento com pausa", notes: "Usar banco como referencia de profundidade e subir com controle." },
  },
  hinge: {
    academia: { name: "Levantamento terra romeno", fallback: "Mesa flexora", notes: "Quadril vai para tras, costas firmes e carga perto do corpo." },
    basico: { name: "Terra romeno com halteres", fallback: "Ponte de gluteo com carga", notes: "Priorizar alongamento de posterior sem perder postura." },
    casa: { name: "Ponte de gluteo unilateral", fallback: "Bom dia sem carga", notes: "Subir o quadril com controle e segurar 1 segundo no topo." },
  },
  unilateralLower: {
    academia: { name: "Afundo ou passada", fallback: "Step-up", notes: "Passada moderada, tronco firme e joelho alinhado." },
    basico: { name: "Afundo com halteres leves", fallback: "Step-up em banco", notes: "Manter controle da perna da frente e evitar colapso do joelho." },
    casa: { name: "Afundo assistido", fallback: "Agachamento bulgaro com apoio", notes: "Usar apoio lateral se ainda houver instabilidade." },
  },
  horizontalPush: {
    academia: { name: "Supino com halteres ou maquina", fallback: "Flexao inclinada", notes: "Escapulas apoiadas e controle total da descida." },
    basico: { name: "Supino no chao com halteres", fallback: "Flexao inclinada", notes: "Nao perder alinhamento entre punho e cotovelo." },
    casa: { name: "Flexao inclinada", fallback: "Flexao na parede", notes: "Corpo em bloco unico, sem despencar quadril." },
  },
  verticalPush: {
    academia: { name: "Desenvolvimento com halteres", fallback: "Maquina de ombros", notes: "Subir sem compensar a lombar." },
    basico: { name: "Desenvolvimento sentado com halteres", fallback: "Arnold press leve", notes: "Usar carga que preserve amplitude e estabilidade." },
    casa: { name: "Pike push-up adaptado", fallback: "Press com mochila", notes: "Controlar velocidade e evitar elevar ombros para frente." },
  },
  horizontalPull: {
    academia: { name: "Remada baixa ou remada curvada apoiada", fallback: "Remada cavalinho", notes: "Fechar escapulas no final do movimento." },
    basico: { name: "Remada unilateral com halter", fallback: "Remada com elastico", notes: "Puxar com cotovelo e evitar girar o tronco." },
    casa: { name: "Remada com mochila", fallback: "Remada em mesa firme", notes: "Usar apoio seguro e concentrar na escápula." },
  },
  verticalPull: {
    academia: { name: "Puxada alta na frente", fallback: "Barra assistida", notes: "Evitar compensar com lombar e puxar ate o topo do peito." },
    basico: { name: "Puxada com elastico alto", fallback: "Pulldown ajoelhado com elastico", notes: "Controlar a subida e manter peito aberto." },
    casa: { name: "Pulldown com toalha/elastico", fallback: "Isometria de puxada", notes: "Criar tensao real no elastico para gerar estimulo." },
  },
  shoulders: {
    academia: { name: "Elevacao lateral", fallback: "Face pull", notes: "Subir ate a linha dos ombros sem tranco." },
    basico: { name: "Elevacao lateral com halteres", fallback: "Crucifixo invertido com halteres", notes: "Usar carga leve e repeticões controladas." },
    casa: { name: "Elevacao lateral com garrafas", fallback: "Prancha com toque de ombro", notes: "Priorizar controle, nao peso." },
  },
  arms: {
    academia: { name: "Rosca direta + triceps na polia", fallback: "Rosca martelo + triceps testa", notes: "Usar amplitudes completas e sem pressa." },
    basico: { name: "Rosca martelo + triceps acima da cabeca", fallback: "Rosca alternada + coice", notes: "Separar os dois movimentos em bi-set leve." },
    casa: { name: "Rosca com mochila + mergulho em banco", fallback: "Rosca isometrica + extensao de triceps", notes: "Manter cotovelos estaveis e evitar compensacoes." },
  },
  core: {
    academia: { name: "Prancha + dead bug ou pallof press", fallback: "Prancha lateral", notes: "Qualidade de contracao vem antes do tempo." },
    basico: { name: "Dead bug + prancha lateral", fallback: "Pallof press com elastico", notes: "Respirar bem e manter lombar neutra." },
    casa: { name: "Prancha + dead bug", fallback: "Bird dog", notes: "Fazer menos tempo e mais controle se necessario." },
  },
  glutes: {
    academia: { name: "Glute bridge / hip thrust", fallback: "Cadeira abdutora", notes: "Segurar o topo por 1 segundo e evitar hiperextensao lombar." },
    basico: { name: "Hip thrust com halter", fallback: "Abducao com miniband", notes: "Empurrar o solo com os pes e alinhar costelas." },
    casa: { name: "Ponte de gluteo com pausa", fallback: "Abducao lateral no solo", notes: "Buscar contracao, nao velocidade." },
  },
  calves: {
    academia: { name: "Panturrilha em pe ou sentada", fallback: "Panturrilha no leg press", notes: "Amplitude total e pausa curta no topo." },
    basico: { name: "Panturrilha em pe unilateral", fallback: "Panturrilha com halter", notes: "Executar devagar, principalmente na descida." },
    casa: { name: "Panturrilha em degrau", fallback: "Panturrilha no solo com pausa", notes: "Usar apoio para equilibrio se necessario." },
  },
  conditioning: {
    academia: { name: "Bike, esteira inclinada ou remo", fallback: "Eliptico", notes: "Manter intensidade prescrita, sem sprint desnecessario." },
    basico: { name: "Bike ergometrica ou circuito funcional", fallback: "Caminhada acelerada", notes: "Manter constancia e controle da respiracao." },
    casa: { name: "Caminhada acelerada ou circuito baixo impacto", fallback: "Subida de escadas controlada", notes: "Evitar impacto alto se o condicionamento ainda for baixo." },
  },
};

export function buildPrescription(profile, generatedAt = new Date()) {
  const split = chooseSplit(profile);
  const weeklyPlan = split.days.map((day, index) => adaptDay(day, profile, index));
  const alerts = buildAlerts(profile);
  const guidelines = buildGuidelines(profile, alerts);
  const progression = buildProgression(profile);

  return {
    splitLabel: split.label,
    analysis: buildAnalysis(profile),
    guidelines,
    weeklyPlan,
    alerts,
    progression,
    coachNote: buildCoachNote(profile, alerts),
    generatedAt: generatedAt.toLocaleString("pt-BR"),
  };
}

function chooseSplit(profile) {
  const templates = {
    2: {
      label: "2 dias | Full body + cardio leve",
      days: [
        { title: "Dia 1", focus: "Corpo inteiro A", cardio: "10 a 15 min leves", mobility: "quadril e tornozelos", blocks: ["squat", "horizontalPush", "horizontalPull", "core", "conditioning"] },
        { title: "Dia 2", focus: "Corpo inteiro B", cardio: "15 a 20 min moderados", mobility: "coluna toracica e ombros", blocks: ["hinge", "unilateralLower", "verticalPush", "verticalPull", "core"] },
      ],
    },
    3: {
      label: "3 dias | Full body com enfase alternada",
      days: [
        { title: "Dia 1", focus: "Forca geral", cardio: "10 min pos-treino", mobility: "quadril e tornozelos", blocks: ["squat", "horizontalPush", "horizontalPull", "core"] },
        { title: "Dia 2", focus: "Posterior + core", cardio: "15 min zona 2", mobility: "lombar, gluteos e toracica", blocks: ["hinge", "glutes", "verticalPull", "shoulders", "core"] },
        { title: "Dia 3", focus: "Misto + condicionamento", cardio: "blocos intervalados curtos", mobility: "ombros e quadris", blocks: ["unilateralLower", "verticalPush", "horizontalPull", "arms", "conditioning"] },
      ],
    },
    4: {
      label: "4 dias | Superior / inferior",
      days: [
        { title: "Dia 1", focus: "Membros superiores A", cardio: "8 a 12 min leve", mobility: "ombros e toracica", blocks: ["horizontalPush", "horizontalPull", "verticalPush", "arms", "core"] },
        { title: "Dia 2", focus: "Membros inferiores A", cardio: "10 min regenerativo", mobility: "quadril e tornozelos", blocks: ["squat", "hinge", "glutes", "calves", "core"] },
        { title: "Dia 3", focus: "Membros superiores B", cardio: "12 a 15 min moderados", mobility: "peitoral e escapulas", blocks: ["verticalPull", "verticalPush", "horizontalPull", "shoulders", "arms"] },
        { title: "Dia 4", focus: "Membros inferiores B", cardio: "zona 2 opcional", mobility: "quadril e posterior", blocks: ["unilateralLower", "hinge", "squat", "calves", "conditioning"] },
      ],
    },
    5: {
      label: "5 dias | Forca + cardio estruturado",
      days: [
        { title: "Dia 1", focus: "Superior", cardio: "10 min leve", mobility: "ombros e toracica", blocks: ["horizontalPush", "horizontalPull", "verticalPush", "arms"] },
        { title: "Dia 2", focus: "Inferior", cardio: "10 min leve", mobility: "quadril e tornozelos", blocks: ["squat", "hinge", "unilateralLower", "calves"] },
        { title: "Dia 3", focus: "Condicionamento", cardio: "20 a 30 min principal", mobility: "global", blocks: ["conditioning", "core", "glutes"] },
        { title: "Dia 4", focus: "Superior / posterior", cardio: "10 min", mobility: "escapulas e peitoral", blocks: ["verticalPull", "horizontalPull", "shoulders", "arms", "core"] },
        { title: "Dia 5", focus: "Inferior / misto", cardio: "intervalado ou zona 2", mobility: "quadris", blocks: ["hinge", "unilateralLower", "glutes", "calves", "conditioning"] },
      ],
    },
    6: {
      label: "6 dias | Rotina alta com controle de intensidade",
      days: [
        { title: "Dia 1", focus: "Push", cardio: "curto regenerativo", mobility: "ombros", blocks: ["horizontalPush", "verticalPush", "shoulders", "arms"] },
        { title: "Dia 2", focus: "Pull", cardio: "curto leve", mobility: "toracica", blocks: ["horizontalPull", "verticalPull", "arms", "core"] },
        { title: "Dia 3", focus: "Legs", cardio: "10 min leves", mobility: "quadril e tornozelos", blocks: ["squat", "hinge", "unilateralLower", "calves"] },
        { title: "Dia 4", focus: "Cardio e mobilidade", cardio: "20 a 35 min principal", mobility: "global", blocks: ["conditioning", "core", "glutes"] },
        { title: "Dia 5", focus: "Superior misto", cardio: "moderado", mobility: "ombros e toracica", blocks: ["horizontalPush", "verticalPull", "shoulders", "arms"] },
        { title: "Dia 6", focus: "Inferior misto", cardio: "opcional", mobility: "quadril e posterior", blocks: ["hinge", "unilateralLower", "glutes", "conditioning"] },
      ],
    },
  };

  const base = {
    label: templates[profile.days].label,
    days: templates[profile.days].days.map((day) => ({ ...day })),
  };

  if (profile.goal === "condicionamento" && profile.days >= 4) {
    base.label += " com prioridade para capacidade cardiorrespiratoria";
  }

  if (profile.goal === "hipertrofia" && profile.days <= 3) {
    base.label += " com volume concentrado em movimentos basicos";
  }

  if (profile.goal === "saude" && profile.days <= 3) {
    base.label += " com foco em aderencia e energia no dia a dia";
  }

  return base;
}

function adaptDay(day, profile, index) {
  const exercises = buildExercisesForDay(day, profile, index);
  return {
    ...day,
    warmup: chooseWarmup(profile),
    volume: experienceVolume[profile.experience],
    intensity: chooseIntensity(profile, index),
    focusDetail: chooseFocusDetail(profile, day),
    preferenceHint: choosePreferenceHint(profile),
    sessionLength: `${profile.sessionLength} min`,
    exercises,
    sessionPrescription: summarizeSessionPrescription(exercises, day, profile),
  };
}

function buildExercisesForDay(day, profile, index) {
  const goalConfig = getGoalConfig(profile.goal, profile.experience, profile.fitnessLevel);
  const blocks = adjustBlocksForProfile(day.blocks, profile, index);

  return blocks.map((blockKey, blockIndex) => {
    const config = resolveExercise(blockKey, profile);
    const prescription = prescriptionForBlock(blockKey, goalConfig, profile, blockIndex);
    return {
      category: formatBlockLabel(blockKey),
      name: config.name,
      alternative: config.alternative,
      sets: prescription.sets,
      reps: prescription.reps,
      rest: prescription.rest,
      effort: prescription.effort,
      notes: `${config.notes} ${prescription.note}`.trim(),
    };
  });
}

function getGoalConfig(goal, experience, fitnessLevel) {
  const isBeginner = experience === "iniciante";
  const isAdvanced = experience === "avancado";
  const lowFitness = fitnessLevel === "baixo";

  const configs = {
    emagrecimento: {
      compoundSets: isBeginner ? 3 : 4,
      accessorySets: isAdvanced ? 4 : 3,
      compoundReps: "8 a 12",
      accessoryReps: "10 a 15",
      coreReps: "30 a 45 s ou 8 a 12 reps",
      restCompound: lowFitness ? "75 a 90 s" : "60 a 90 s",
      restAccessory: "45 a 60 s",
      conditioningRest: "30 a 45 s",
      effort: "RPE 7 a 8",
      conditioningText: "12 a 18 min em ritmo moderado ou intervalado leve",
    },
    hipertrofia: {
      compoundSets: isBeginner ? 3 : 4,
      accessorySets: isAdvanced ? 4 : 3,
      compoundReps: "6 a 10",
      accessoryReps: "8 a 12",
      coreReps: "8 a 15 reps",
      restCompound: "90 a 120 s",
      restAccessory: "60 a 75 s",
      conditioningRest: "45 s",
      effort: "RPE 7,5 a 9",
      conditioningText: "8 a 12 min leve para recuperacao",
    },
    condicionamento: {
      compoundSets: isBeginner ? 2 : 3,
      accessorySets: isAdvanced ? 4 : 3,
      compoundReps: "10 a 15",
      accessoryReps: "12 a 15",
      coreReps: "30 a 45 s ou 10 a 15 reps",
      restCompound: "45 a 75 s",
      restAccessory: "30 a 45 s",
      conditioningRest: "20 a 40 s",
      effort: "RPE 6,5 a 8",
      conditioningText: "15 a 25 min, alternando base aerobica e blocos curtos",
    },
    saude: {
      compoundSets: isBeginner ? 2 : 3,
      accessorySets: 2,
      compoundReps: "8 a 12",
      accessoryReps: "10 a 15",
      coreReps: "20 a 40 s ou 8 a 12 reps",
      restCompound: "60 a 90 s",
      restAccessory: "45 a 60 s",
      conditioningRest: "30 a 45 s",
      effort: "RPE 6 a 7,5",
      conditioningText: "12 a 20 min em intensidade conversavel",
    },
  };

  return configs[goal];
}

function adjustBlocksForProfile(blocks, profile, index) {
  const adjusted = [...blocks];

  if (profile.limitations.includes("joelho")) {
    const squatIndex = adjusted.indexOf("squat");
    if (squatIndex >= 0) adjusted[squatIndex] = "glutes";
    const conditioningIndex = adjusted.indexOf("conditioning");
    if (conditioningIndex >= 0) adjusted[conditioningIndex] = "conditioning";
  }

  if (profile.limitations.includes("ombro")) {
    const verticalPushIndex = adjusted.indexOf("verticalPush");
    if (verticalPushIndex >= 0) adjusted[verticalPushIndex] = "shoulders";
  }

  if (profile.limitations.includes("lombar")) {
    const hingeIndex = adjusted.indexOf("hinge");
    if (hingeIndex >= 0) adjusted[hingeIndex] = "glutes";
  }

  if (profile.goal === "condicionamento" && !adjusted.includes("conditioning") && index === adjusted.length - 1) {
    adjusted.push("conditioning");
  }

  return adjusted;
}

function resolveExercise(blockKey, profile) {
  const equipment = profile.equipment;
  const entry = exerciseLibrary[blockKey][equipment];
  const alternative = chooseAlternative(blockKey, profile, entry.fallback);
  return {
    name: chooseMainVariation(blockKey, profile, entry.name),
    alternative,
    notes: chooseNotes(blockKey, profile, entry.notes),
  };
}

function chooseMainVariation(blockKey, profile, defaultName) {
  if (blockKey === "conditioning") {
    if (profile.preferences.includes("bike")) return "Bike ergometrica";
    if (profile.preferences.includes("corrida") && !profile.limitations.includes("joelho")) return "Corrida leve a moderada";
    if (profile.preferences.includes("funcional")) return "Circuito funcional de baixo impacto";
  }

  if (blockKey === "horizontalPush" && profile.limitations.includes("ombro")) {
    return profile.equipment === "academia" ? "Supino em maquina com amplitude controlada" : "Flexao inclinada com amplitude confortavel";
  }

  if (blockKey === "hinge" && profile.limitations.includes("lombar")) {
    return profile.equipment === "academia" ? "Mesa flexora" : "Ponte de gluteo com pausa";
  }

  return defaultName;
}

function chooseAlternative(blockKey, profile, fallback) {
  if (blockKey === "conditioning") {
    if (profile.preferences.includes("mobilidade")) {
      return "Caminhada inclinada + bloco extra de mobilidade";
    }
    return fallback;
  }

  if (blockKey === "squat" && profile.limitations.includes("joelho")) {
    return "Sentar e levantar de banco alto com controle";
  }

  return fallback;
}

function chooseNotes(blockKey, profile, baseNotes) {
  if (blockKey === "conditioning" && profile.goal === "emagrecimento") {
    return `${baseNotes} Priorizar constancia e frequencia cardiaca sustentavel.`;
  }

  if (blockKey === "conditioning" && profile.goal === "condicionamento") {
    return `${baseNotes} Trabalhar respiracao e recuperar bem entre blocos.`;
  }

  if (blockKey === "squat" && profile.limitations.includes("joelho")) {
    return `${baseNotes} Se houver dor acima de leve desconforto, reduzir amplitude ou trocar pelo alternativo.`;
  }

  if (blockKey === "verticalPush" && profile.limitations.includes("ombro")) {
    return `${baseNotes} Evitar arco lombar e interromper se houver pinçamento ou dor.`;
  }

  return baseNotes;
}

function prescriptionForBlock(blockKey, goalConfig, profile, blockIndex) {
  const isCompound = ["squat", "hinge", "horizontalPush", "verticalPush", "horizontalPull", "verticalPull", "unilateralLower"].includes(blockKey);
  const isConditioning = blockKey === "conditioning";
  const isCore = blockKey === "core";

  if (isConditioning) {
    return {
      sets: profile.goal === "condicionamento" ? "4 a 8 blocos" : "1 bloco continuo",
      reps: goalConfig.conditioningText,
      rest: goalConfig.conditioningRest,
      effort: profile.goal === "condicionamento" ? "RPE 7 a 8" : "RPE 6 a 7",
      note: profile.goal === "condicionamento"
        ? "Alternar ritmos de 1 a 3 minutos com recuperacao curta."
        : "Usar como finalizador sem comprometer a recuperacao do resto da semana.",
    };
  }

  if (isCore) {
    return {
      sets: profile.experience === "iniciante" ? "2 a 3" : "3",
      reps: goalConfig.coreReps,
      rest: "30 a 45 s",
      effort: "RPE 6 a 7",
      note: "Manter controle total do tronco e respiracao consistente.",
    };
  }

  return {
    sets: isCompound ? String(goalConfig.compoundSets) : String(goalConfig.accessorySets),
    reps: isCompound ? goalConfig.compoundReps : goalConfig.accessoryReps,
    rest: isCompound ? goalConfig.restCompound : goalConfig.restAccessory,
    effort: goalConfig.effort,
    note: blockIndex <= 1
      ? "Exercicio principal do dia: priorizar boa tecnica antes de aumentar carga."
      : "Executar com ritmo controlado e sem acelerar para terminar rapido.",
  };
}

function summarizeSessionPrescription(exercises, day, profile) {
  const mainExercises = exercises.slice(0, 2).map((item) => item.name).join(" e ");
  const cardioLine = day.cardio ? ` O cardio do dia entra como ${day.cardio}.` : "";
  return `Sessao orientada por ${mainExercises}, com volume ajustado para objetivo de ${goalLabels[profile.goal].toLowerCase()}.${cardioLine}`;
}

function formatBlockLabel(blockKey) {
  const labels = {
    squat: "Dominante de joelho",
    hinge: "Dominante de quadril",
    unilateralLower: "Unilateral de membros inferiores",
    horizontalPush: "Empurrar horizontal",
    verticalPush: "Empurrar vertical",
    horizontalPull: "Puxar horizontal",
    verticalPull: "Puxar vertical",
    shoulders: "Ombros / estabilidade escapular",
    arms: "Bracos",
    core: "Core",
    glutes: "Gluteos",
    calves: "Panturrilhas",
    conditioning: "Condicionamento",
  };
  return labels[blockKey] || blockKey;
}

function buildAnalysis(profile) {
  const parts = [
    `${profile.name || "Aluno"} tem ${profile.age} anos, objetivo de ${goalLabels[profile.goal].toLowerCase()} e disponibilidade para ${profile.days} treinos semanais de ${profile.sessionLength} minutos.`,
    `O nivel declarado e ${profile.experience} com condicionamento ${profile.fitnessLevel}, o que pede uma prescricao inicial ${profile.experience === "iniciante" ? "simples, segura e altamente repetivel" : "progressiva, mas ainda controlada"}.`,
    `A estrutura foi pensada para o contexto ${equipmentStyles[profile.equipment]}.`,
  ];

  if (profile.limitations.length > 0) {
    parts.push(`As limitacoes reportadas (${profile.limitations.join(", ")}) pedem ajuste de impacto, amplitude, selecao de exercicios e monitoramento de sintomas.`);
  }

  if (profile.sleepQuality === "baixa") {
    parts.push("Como a qualidade do sono esta baixa, o volume inicial foi segurado para proteger recuperacao e aderencia.");
  }

  return parts.join(" ");
}

function buildGuidelines(profile, alerts) {
  const list = [
    "Comecar com percepcao de esforco entre 6 e 8 em 10, preservando boa tecnica e margem de execucao.",
    "Incluir aquecimento de 5 a 8 minutos e mobilidade dirigida antes de cada sessao.",
    "Aplicar progressao dupla: bater o topo da faixa de repeticoes com boa tecnica antes de subir a carga.",
    "Registrar presenca, energia, desconfortos e resposta ao treino para recalibrar a planilha na revisao.",
  ];

  if (profile.goal === "emagrecimento") {
    list.push("Manter musculacao como eixo principal e usar o cardio como apoio para gasto energetico e condicionamento.");
  }

  if (profile.goal === "hipertrofia") {
    list.push("Priorizar constancia na execucao dos movimentos basicos, proximidade da falha controlada e distribuicao do volume.");
  }

  if (profile.goal === "condicionamento") {
    list.push("Equilibrar sessoes moderadas com picos curtos de intensidade, sem transformar toda a semana em treino exaustivo.");
  }

  if (profile.goal === "saude") {
    list.push("Buscar rotina viavel, prazerosa e suficiente para aumentar disposicao e qualidade de vida sem excessos.");
  }

  if (alerts.length > 0) {
    list.push("Revisar sinais clinicos ou ortopedicos antes de progredir intensidade, especialmente se houver dor ou historico relevante.");
  }

  return list;
}

function buildAlerts(profile) {
  const alerts = [];

  if (profile.limitations.includes("joelho")) {
    alerts.push("Preferir progressao gradual em impactos. Comecar cardio com bike, eliptico ou caminhada inclinada antes de corrida intensa.");
  }

  if (profile.limitations.includes("lombar")) {
    alerts.push("Monitorar hinge, cargas axiais e fadiga do core. Priorizar tecnica, amplitude toleravel e estabilidade.");
  }

  if (profile.limitations.includes("ombro")) {
    alerts.push("Observar empurradas e elevacoes acima da cabeca. Usar pegadas e amplitudes confortaveis.");
  }

  if (profile.limitations.includes("hipertensao")) {
    alerts.push("Evitar inicio com HIIT agressivo e orientar controle de respiracao, pausas adequadas e liberacao medica quando necessario.");
  }

  if (profile.sleepQuality === "baixa") {
    alerts.push("Sono ruim reduz recuperacao. Segurar o volume inicial e revisar habitos antes de avancar intensidade.");
  }

  if (profile.limitations.includes("sedentarismo")) {
    alerts.push("Sedentarismo prolongado pede transicao cuidadosa: mais regularidade e menos heroismo nas primeiras semanas.");
  }

  if (alerts.length === 0) {
    alerts.push("Sem alerta critico na triagem inicial, mas a progressao deve continuar baseada em resposta real ao treino.");
  }

  return alerts;
}

function buildProgression(profile) {
  return [
    "Semana 1: consolidar tecnica, ritmo e presenca. Manter 1 a 3 repeticoes em reserva na maior parte dos exercicios.",
    "Semana 2: repetir a estrutura e adicionar 1 a 2 repeticoes por serie nos exercicios que ficaram confortaveis.",
    "Semana 3: se o topo da faixa saiu com boa tecnica, subir a carga entre 2% e 5% nos exercicios principais.",
    profile.experience === "iniciante"
      ? "Semana 4: manter o padrao, revisar dores, confianca e aderencia antes de aumentar volume."
      : "Semana 4: consolidar o bloco e decidir se o proximo ciclo vai subir carga, volume ou densidade.",
  ];
}

function buildCoachNote(profile, alerts) {
  const noteParts = [
    "Use esta saida como prescricao inicial, nao como treino fechado por tempo indeterminado.",
    "A primeira revisao ideal acontece entre 10 e 14 dias para verificar aderencia, tecnica, dores, tolerancia ao volume e acerto da faixa de carga.",
  ];

  if (profile.notes) {
    noteParts.push(`Ponto importante da anamnese para aprofundar na conversa: ${profile.notes}`);
  }

  if (alerts.length > 0 && !alerts[0].startsWith("Sem alerta critico")) {
    noteParts.push("Ha sinais de cuidado que merecem validacao presencial ou acompanhamento mais proximo antes de intensificar o plano.");
  }

  return noteParts.join(" ");
}

function chooseWarmup(profile) {
  if (profile.limitations.includes("joelho")) {
    return "5 min de bike ou caminhada + mobilidade de tornozelo e ativacao de quadriceps e gluteos.";
  }

  if (profile.limitations.includes("ombro")) {
    return "Mobilidade toracica, escapulas e manguito + series leves de empurrar e puxar.";
  }

  if (profile.limitations.includes("lombar")) {
    return "Respiracao, ativacao de core e quadril + hinge leve antes de carregar.";
  }

  return "5 a 8 min de cardio leve + mobilidade das articulacoes que serao mais exigidas no dia.";
}

function chooseIntensity(profile, index) {
  if (profile.goal === "hipertrofia") {
    return index % 2 === 0
      ? "Esforco moderado a alto, sem falha em todos os exercicios."
      : "Esforco moderado, com tecnica impecavel.";
  }

  if (profile.goal === "condicionamento") {
    return index >= 2
      ? "Sessao com componente metabolico controlado."
      : "Base aerobica e forca com pausas bem organizadas.";
  }

  return "Esforco moderado, sustentavel e facil de repetir na semana seguinte.";
}

function chooseFocusDetail(profile, day) {
  const map = {
    emagrecimento: "manter bom gasto energetico sem comprometer recuperacao",
    hipertrofia: "priorizar execucao, tensao mecanica e constancia nas cargas",
    condicionamento: "melhorar tolerancia ao esforco e recuperacao entre blocos",
    saude: "melhorar disposicao, funcao e autonomia no dia a dia",
  };

  return `${day.focus} com enfase em ${map[profile.goal]}.`;
}

function choosePreferenceHint(profile) {
  if (profile.preferences.includes("corrida") && !profile.limitations.includes("joelho")) {
    return "Preferencia aproveitada: cardio do dia pode migrar para corrida leve quando fizer sentido.";
  }

  if (profile.preferences.includes("bike")) {
    return "Preferencia aproveitada: bicicleta e uma boa opcao principal para cardio de base.";
  }

  if (profile.preferences.includes("funcional")) {
    return "Preferencia aproveitada: alguns blocos podem entrar em circuito funcional com controle de tecnica.";
  }

  if (profile.preferences.includes("mobilidade")) {
    return "Preferencia aproveitada: vale encerrar a sessao com bloco curto de mobilidade guiada.";
  }

  return "Estrutura escolhida para combinar objetivo, contexto de treino e aderencia semanal.";
}
