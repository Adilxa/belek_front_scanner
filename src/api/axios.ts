import axios from "axios";


const BASE_URL = 'https://bonus.belektech.kg/';

const $api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
})


export default $api;
