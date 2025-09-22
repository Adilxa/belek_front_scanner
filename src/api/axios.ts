import axios from "axios";


const BASE_URL = 'http://192.168.0.106:8080/';

const $api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
})


export default $api;
