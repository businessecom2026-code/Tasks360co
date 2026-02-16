import { Language } from './types';

export const translations = {
  en: {
    sidebar: {
      dashboard: 'Dashboard',
      tasks: 'My Tasks',
      meetings: 'Meetings',
      chat: 'Communication',
      user: 'User',
      view: 'VIEW'
    },
    dashboard: {
      title: 'Productivity Overview',
      pending: 'Pending Tasks',
      inProgress: 'In Progress',
      completed: 'Completed',
      velocity: 'Task Velocity',
      focus: 'Focus Hours',
      restricted: 'Access Restricted. Please navigate to Meetings.'
    },
    kanban: {
      title: 'Tasks',
      boardView: 'Board',
      listView: 'List',
      addColumn: 'Add Column',
      enterColumnTitle: 'Column Title',
      deleteColumn: 'Delete Column',
      rename: 'Rename',
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      addTask: 'Add Task',
      pending: 'Pending',
      inProgress: 'In Progress',
      done: 'Done',
      accessDenied: 'Access Denied. Clients cannot view internal tasks.',
      enterTitle: 'Enter task title:',
      generatedDesc: 'New generated task',
      syncedGCal: 'Synced to Google Calendar',
      columns: {
        title: 'Title',
        status: 'Status',
        dueDate: 'Due Date',
        assignee: 'Assignee',
        actions: 'Actions'
      },
      editModal: {
        title: 'Edit Task',
        taskTitle: 'Task Title',
        description: 'Description',
        coverImage: 'Cover Image',
        upload: 'Upload Image',
        changeColor: 'Label Color',
        save: 'Save Changes',
        cancel: 'Cancel',
        delete: 'Delete Task'
      }
    },
    meetings: {
      title: 'Meetings & Calendar',
      schedule: 'Schedule',
      startAI: 'Start AI Meeting',
      integrationTitle: 'Google Calendar',
      synced: 'Synced with ecom360.co',
      connect: 'Connect your calendar to sync events automatically.',
      connectBtn: 'Connect Account',
      upcoming: 'Upcoming Events',
      copyLink: 'Copy Link',
      join: 'Join Now',
      residentTitle: 'AI Resident',
      ready: 'Ready to start',
      listening: 'Listening & Processing...',
      transcript: 'Live Transcript',
      turns: 'turns',
      waiting: 'Start the session to begin.',
      waitingDesc: 'I will record, filter small talk, and extract action items automatically.',
      reportTitle: 'Meeting Report',
      agenda: 'Agenda',
      decisions: 'Decisions',
      actionItems: 'Action Items',
      generating: 'Generating Report...',
      endProcess: 'End & Process',
      startBtn: 'Start AI Meeting',
      export: 'Export',
      close: 'Close',
      unassigned: 'Unassigned',
      taskCreated: 'Task created successfully'
    },
    chat: {
      header: 'Team & Support Chat',
      placeholder: 'Type your message...',
      typing: 'AI is typing...',
      error: 'Error connecting to AI service.',
      welcome: 'Hello! I am Task 360.co support AI. How can I help you today?'
    },
    common: {
      apiKeyMissing: 'API Key Missing'
    }
  },
  pt: {
    sidebar: {
      dashboard: 'Dashboard',
      tasks: 'Minhas Tarefas',
      meetings: 'Reuniões',
      chat: 'Comunicação',
      user: 'Usuário',
      view: 'VISÃO'
    },
    dashboard: {
      title: 'Visão Geral de Produtividade',
      pending: 'Tarefas Pendentes',
      inProgress: 'Em Progresso',
      completed: 'Concluídas',
      velocity: 'Velocidade de Tarefas',
      focus: 'Horas de Foco',
      restricted: 'Acesso Restrito. Por favor navegue para Reuniões.'
    },
    kanban: {
      title: 'Tarefas',
      boardView: 'Quadro',
      listView: 'Lista',
      addColumn: 'Nova Coluna',
      enterColumnTitle: 'Título da Coluna',
      deleteColumn: 'Excluir Coluna',
      rename: 'Renomear',
      moveLeft: 'Mover p/ Esquerda',
      moveRight: 'Mover p/ Direita',
      addTask: 'Nova Tarefa',
      pending: 'Pendente',
      inProgress: 'Em Curso',
      done: 'Concluído',
      accessDenied: 'Acesso Negado. Clientes não podem ver tarefas internas.',
      enterTitle: 'Digite o título da tarefa:',
      generatedDesc: 'Nova tarefa gerada',
      syncedGCal: 'Sincronizado com Google Agenda',
      columns: {
        title: 'Título',
        status: 'Status',
        dueDate: 'Data',
        assignee: 'Responsável',
        actions: 'Ações'
      },
      editModal: {
        title: 'Editar Tarefa',
        taskTitle: 'Título da Tarefa',
        description: 'Descrição',
        coverImage: 'Imagem de Capa',
        upload: 'Carregar Imagem',
        changeColor: 'Cor da Etiqueta',
        save: 'Salvar Alterações',
        cancel: 'Cancelar',
        delete: 'Excluir Tarefa'
      }
    },
    meetings: {
      title: 'Reuniões e Agenda',
      schedule: 'Agendar',
      startAI: 'Iniciar Reunião IA',
      integrationTitle: 'Google Agenda',
      synced: 'Sincronizado com ecom360.co',
      connect: 'Conecte sua agenda para sincronizar eventos automaticamente.',
      connectBtn: 'Conectar Conta',
      upcoming: 'Próximos Eventos',
      copyLink: 'Copiar Link',
      join: 'Entrar Agora',
      residentTitle: 'IA Residente',
      ready: 'Pronto para iniciar',
      listening: 'Ouvindo e Processando...',
      transcript: 'Transcrição ao Vivo',
      turns: 'turnos',
      waiting: 'Inicie a sessão para começar.',
      waitingDesc: 'Vou gravar, filtrar conversas irrelevantes e extrair ações automaticamente.',
      reportTitle: 'Relatório da Reunião',
      agenda: 'Pauta',
      decisions: 'Decisões',
      actionItems: 'Ações (To-do)',
      generating: 'Gerando Relatório...',
      endProcess: 'Finalizar e Processar',
      startBtn: 'Iniciar Reunião IA',
      export: 'Exportar',
      close: 'Fechar',
      unassigned: 'Não atribuído',
      taskCreated: 'Tarefa criada com sucesso'
    },
    chat: {
      header: 'Chat de Equipe e Suporte',
      placeholder: 'Digite sua mensagem...',
      typing: 'IA digitando...',
      error: 'Erro ao conectar ao serviço de IA.',
      welcome: 'Olá! Sou a IA de suporte Task 360.co. Como posso ajudar hoje?'
    },
    common: {
      apiKeyMissing: 'Chave API Ausente'
    }
  },
  es: {
    sidebar: {
      dashboard: 'Tablero',
      tasks: 'Mis Tareas',
      meetings: 'Reuniones',
      chat: 'Comunicación',
      user: 'Usuario',
      view: 'VISTA'
    },
    dashboard: {
      title: 'Resumen de Productividad',
      pending: 'Tareas Pendientes',
      inProgress: 'En Progreso',
      completed: 'Completadas',
      velocity: 'Velocidad de Tareas',
      focus: 'Horas de Enfoque',
      restricted: 'Acceso Restringido. Por favor navegue a Reuniones.'
    },
    kanban: {
      title: 'Tareas',
      boardView: 'Tablero',
      listView: 'Lista',
      addColumn: 'Añadir Columna',
      enterColumnTitle: 'Título de Columna',
      deleteColumn: 'Eliminar Columna',
      rename: 'Renombrar',
      moveLeft: 'Mover Izquierda',
      moveRight: 'Mover Derecha',
      addTask: 'Nueva Tarea',
      pending: 'Pendiente',
      inProgress: 'En Progreso',
      done: 'Hecho',
      accessDenied: 'Acceso Denegado. Clientes no pueden ver tareas internas.',
      enterTitle: 'Ingrese el título de la tarea:',
      generatedDesc: 'Nueva tarea generada',
      syncedGCal: 'Sincronizado con Google Calendar',
      columns: {
        title: 'Título',
        status: 'Estado',
        dueDate: 'Fecha',
        assignee: 'Asignado',
        actions: 'Acciones'
      },
      editModal: {
        title: 'Editar Tarea',
        taskTitle: 'Título de Tarea',
        description: 'Descripción',
        coverImage: 'Imagen de Portada',
        upload: 'Subir Imagen',
        changeColor: 'Color de Etiqueta',
        save: 'Guardar Cambios',
        cancel: 'Cancelar',
        delete: 'Eliminar Tarea'
      }
    },
    meetings: {
      title: 'Reuniones y Calendario',
      schedule: 'Programar',
      startAI: 'Iniciar Reunión IA',
      integrationTitle: 'Google Calendar',
      synced: 'Sincronizado con ecom360.co',
      connect: 'Conecte su calendario para sincronizar eventos automaticamente.',
      connectBtn: 'Conectar Cuenta',
      upcoming: 'Próximos Eventos',
      copyLink: 'Copiar Enlace',
      join: 'Unirse Ahora',
      residentTitle: 'IA Residente',
      ready: 'Listo para comenzar',
      listening: 'Escuchando y Procesando...',
      transcript: 'Transcripción en Vivo',
      turns: 'turnos',
      waiting: 'Inicie la sesión para comenzar.',
      waitingDesc: 'Grabaré, filtraré conversaciones irrelevantes y extraeré acciones automáticamente.',
      reportTitle: 'Informe de Reunión',
      agenda: 'Agenda',
      decisions: 'Decisiones',
      actionItems: 'Acciones',
      generating: 'Generando Informe...',
      endProcess: 'Finalizar y Procesar',
      startBtn: 'Iniciar Reunión IA',
      export: 'Exportar',
      close: 'Cerrar',
      unassigned: 'Sin asignar',
      taskCreated: 'Tarea creada con éxito'
    },
    chat: {
      header: 'Chat de Equipo y Soporte',
      placeholder: 'Escribe tu mensaje...',
      typing: 'IA escribiendo...',
      error: 'Error al conectar con el servicio de IA.',
      welcome: '¡Hola! Soy la IA de soporte de Task 360.co. ¿Cómo puedo ayudar hoy?'
    },
    common: {
      apiKeyMissing: 'Falta Clave API'
    }
  },
  it: {
    sidebar: {
      dashboard: 'Dashboard',
      tasks: 'Le mie attività',
      meetings: 'Riunioni',
      chat: 'Comunicazione',
      user: 'Utente',
      view: 'VISTA'
    },
    dashboard: {
      title: 'Panoramica produttività',
      pending: 'Attività in sospeso',
      inProgress: 'In corso',
      completed: 'Completate',
      velocity: 'Velocità attività',
      focus: 'Ore di concentrazione',
      restricted: 'Accesso limitato. Si prega di andare a Riunioni.'
    },
    kanban: {
      title: 'Attività',
      boardView: 'Bacheca',
      listView: 'Elenco',
      addColumn: 'Aggiungi colonna',
      enterColumnTitle: 'Titolo colonna',
      deleteColumn: 'Elimina colonna',
      rename: 'Rinomina',
      moveLeft: 'Sposta a sinistra',
      moveRight: 'Sposta a destra',
      addTask: 'Nuova attività',
      pending: 'In sospeso',
      inProgress: 'In corso',
      done: 'Fatto',
      accessDenied: 'Accesso negato. I clienti non possono visualizzare attività interne.',
      enterTitle: 'Inserisci il titolo dell\'attività:',
      generatedDesc: 'Nuova attività generata',
      syncedGCal: 'Sincronizzato con Google Calendar',
      columns: {
        title: 'Titolo',
        status: 'Stato',
        dueDate: 'Scadenza',
        assignee: 'Assegnatario',
        actions: 'Azioni'
      },
      editModal: {
        title: 'Modifica attività',
        taskTitle: 'Titolo attività',
        description: 'Descrizione',
        coverImage: 'Immagine di copertina',
        upload: 'Carica immagine',
        changeColor: 'Colore etichetta',
        save: 'Salva modifiche',
        cancel: 'Annulla',
        delete: 'Elimina attività'
      }
    },
    meetings: {
      title: 'Riunioni e Calendario',
      schedule: 'Pianifica',
      startAI: 'Avvia riunione IA',
      integrationTitle: 'Google Calendar',
      synced: 'Sincronizzato con ecom360.co',
      connect: 'Connetti il tuo calendario per sincronizzare automaticamente gli eventi.',
      connectBtn: 'Connetti account',
      upcoming: 'Prossimi eventi',
      copyLink: 'Copia link',
      join: 'Partecipa ora',
      residentTitle: 'IA Residente',
      ready: 'Pronto per iniziare',
      listening: 'Ascolto ed elaborazione...',
      transcript: 'Trascrizione dal vivo',
      turns: 'turni',
      waiting: 'Inizia la sessione per cominciare.',
      waitingDesc: 'Registrerò, filtrerò le conversazioni irrilevanti ed estrarrò automaticamente le azioni.',
      reportTitle: 'Report riunione',
      agenda: 'Ordine del giorno',
      decisions: 'Decisioni',
      actionItems: 'Azioni',
      generating: 'Generazione report...',
      endProcess: 'Termina ed elabora',
      startBtn: 'Avvia riunione IA',
      export: 'Esporta',
      close: 'Chiudi',
      unassigned: 'Non assegnato',
      taskCreated: 'Attività creata con successo'
    },
    chat: {
      header: 'Chat team e supporto',
      placeholder: 'Scrivi il tuo messaggio...',
      typing: 'IA sta scrivendo...',
      error: 'Errore di connessione al servizio IA.',
      welcome: 'Ciao! Sono l\'IA di supporto di Task 360.co. Come posso aiutarti oggi?'
    },
    common: {
      apiKeyMissing: 'Chiave API mancante'
    }
  }
};
