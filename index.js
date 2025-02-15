const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

dotenv.config();

process.env.TZ = 'Asia/Jakarta';

const dates = process.env.DATE_DEPARTURE.split(',');
const intervalDuration = parseInt(process.env.INTERVAL_IN_MILLISECONDS, 10);
const from = process.env.FROM;
const to = process.env.TO;

let currentIndex = 0;
let scrapeInterval;

const sendMessage = async (target, message) => {
  try {
    const formData = new FormData();
    formData.append('target', target);
    formData.append('message', message);
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: process.env.FONNTE_KEY,
      },
    });
    console.log('Message sent:', message);
    return response.json();
  } catch (error) {
    throw new Error(error.message);
  }
};

const scrapeHandler = async (date) => {
  try {
    const response = await axios.request({
      method: 'GET',
      url: `https://www.tiketkai.com/kereta/search?from=${from}&to=${to}&date=${date}&adult=1&infant=0`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    let messageSent = false;

    $('.cruise-list .box').each((i, el) => {
      const namaKereta = $(el).find('span').first().text().trim();
      const jamKeberangkatan = $(el).attr('data-jamberangkat');
      const jamTiba = $(el).attr('data-jamtiba');
      const dari = $(el).attr('data-stkeberangkatan');
      const ke = $(el).attr('data-sttiba');
      const kelas = $(el).attr('data-kelas');
      const harga = $(el).attr('data-harga');
      const kursiTersedia = $(el).find('.submit_berangkat').length > 0;

      if (namaKereta === process.env.TRAIN_NAME && kursiTersedia) {
        sendMessage(process.env.FONNTE_TARGET, `
Ketersediaan: Kursi Tersedia
Tanggal: ${date}
Nama Kereta: ${namaKereta}
Jam Keberangkatan: ${jamKeberangkatan}
Jam Tiba: ${jamTiba}
Dari: ${dari}
Ke: ${ke}
Kelas: ${kelas}
Harga: Rp ${harga}`);
        messageSent = true;
        return false;
      }
    });

    if (messageSent) {
      clearInterval(scrapeInterval);
    }
  } catch (error) {
    console.error(`Error for date ${date}:`, error);
  }
};

const startScraping = () => {
  if (currentIndex >= dates.length) {
    currentIndex = 0;
  }

  const currentDate = dates[currentIndex];
  scrapeHandler(currentDate);

  currentIndex += 1;
};

scrapeInterval = setInterval(startScraping, intervalDuration);

startScraping();
