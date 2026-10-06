import axios from "axios";

export const API = "/api";

export const api = axios.create({ baseURL: API });
