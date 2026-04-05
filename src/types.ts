export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatState {
  step: 'collecting' | 'responding';
  collectedInfo: {
    name?: string;
    dob?: string;
    time?: string;
    location?: string;
    language?: string;
    problem?: string;
  };
}
