import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Linking, Image,
  StatusBar, SafeAreaView, Platform,
} from 'react-native';

const API = 'http://100.86.81.25:8000';

const GENRES = ['Tümü','Roman','Bilim Kurgu','Fantastik','Polisiye','Tarih','Biyografi','Felsefe','Şiir'];
const MOODS  = ['Fark Etmez','Heyecan Verici','Düşündürücü','Karanlık','Romantik','Komik','Sakinleştirici','İlham Verici'];

type Book = {
  title: string;
  author: string;
  genre: string;
  summary: string;
};

function parseBooks(text: string): Book[] {
  const books: Book[] = [];
  const chunks = text.split(/\n(?=\d+\.)/).filter(Boolean);
  for (const chunk of chunks) {
    const titleMatch   = chunk.match(/\*\*(.+?)\*\*/);
    const authorMatch  = chunk.match(/[-–]\s*([^\n]+?)(?:\n|Tür:|$)/) || chunk.match(/Yazar[:\s]+([^\n]+)/i);
    const genreMatch   = chunk.match(/Tür[:\s]+([^\n]+)/i);
    const summaryMatch = chunk.match(/Özet[:\s]+([^]+?)(?=\n\n|\n\d+\.|$)/i);
    if (titleMatch) {
      books.push({
        title:   titleMatch[1].trim(),
        author:  authorMatch  ? authorMatch[1].trim().replace(/\*\*/g,'') : '',
        genre:   genreMatch   ? genreMatch[1].trim()   : '',
        summary: summaryMatch ? summaryMatch[1].trim().replace(/--BOOK JACKET/gi,'').trim() : '',
      });
    }
  }
  return books;
}

export default function App() {
  const [dark, setDark]         = useState(false);
  const [query, setQuery]       = useState('');
  const [genre, setGenre]       = useState('Tümü');
  const [mood, setMood]         = useState('Fark Etmez');
  const [loading, setLoading]   = useState(false);
  const [books, setBooks]       = useState<Book[]>([]);
  const [rawText, setRawText]   = useState('');
  const [error, setError]       = useState('');
  const [olData, setOlData]     = useState<{[key:string]: any}>({});
  const [olLoading, setOlLoading] = useState<{[key:string]: boolean}>({});

  const c = dark ? darkColors : lightColors;

  async function recommend() {
    setLoading(true);
    setError('');
    setBooks([]);
    setRawText('');
    try {
      const res = await fetch(`${API}/api/recommend`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          query,
          genre: genre === 'Tümü' ? 'any' : genre,
          mood:  mood  === 'Fark Etmez' ? 'any' : mood,
        }),
      });
      const data = await res.json();
      const text = data.response || '';
      setRawText(text);
      setBooks(parseBooks(text));
    } catch(e: any) {
      setError('API\'ye bağlanılamadı. Tailscale açık mı?');
    } finally {
      setLoading(false);
    }
  }

  async function viewBook(title: string, author: string, idx: number) {
    setOlLoading(p => ({...p, [idx]: true}));
    try {
      const q = encodeURIComponent(`${title} ${author}`);
      const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
      const data = await res.json();
      const doc  = data.docs?.[0];
      if (doc) {
        setOlData(p => ({...p, [idx]: {
          title:   doc.title,
          author:  doc.author_name?.[0] || author,
          year:    doc.first_publish_year,
          cover:   doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
          link:    `https://openlibrary.org${doc.key}`,
        }}));
      } else {
        setOlData(p => ({...p, [idx]: {error: 'Bulunamadı'}}));
      }
    } catch {
      setOlData(p => ({...p, [idx]: {error: 'Hata oluştu'}}));
    } finally {
      setOlLoading(p => ({...p, [idx]: false}));
    }
  }

  return (
    <SafeAreaView style={[s.safe, {backgroundColor: c.bg}]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={c.surface} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[s.header, {backgroundColor: c.surface, borderBottomColor: c.border}]}>
          <Text style={[s.logo, {color: c.text}]}>📖 kitap.ai</Text>
          <TouchableOpacity style={[s.themeBtn, {backgroundColor: c.tagBg, borderColor: c.border}]} onPress={() => setDark(d => !d)}>
            <Text style={{color: c.text2, fontSize: 13}}>{dark ? '☀️ Açık' : '🌙 Koyu'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.eyebrow, {backgroundColor: c.glow, borderColor: c.accent}]}>
            <Text style={[s.eyebrowText, {color: c.accent}]}>✦ Yapay Zeka Destekli</Text>
          </View>
          <Text style={[s.heroTitle, {color: c.text}]}>Sana özel{'\n'}<Text style={{color: c.accent, fontStyle:'italic'}}>kitap önerileri</Text></Text>
          <Text style={[s.heroSub, {color: c.text2}]}>Ruh haline ve zevkine göre kitap bul.</Text>
        </View>

        {/* Form */}
        <View style={[s.card, {backgroundColor: c.surface, borderColor: c.border}]}>

          <Text style={[s.label, {color: c.text2}]}>NE ARIYORSUN?</Text>
          <TextInput
            style={[s.input, {backgroundColor: c.inputBg, borderColor: c.border, color: c.text}]}
            placeholder="Konu, his veya yazar…"
            placeholderTextColor={c.text2}
            value={query}
            onChangeText={setQuery}
            multiline
          />

          <Text style={[s.label, {color: c.text2, marginTop: 14}]}>TÜR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
            {GENRES.map(g => (
              <TouchableOpacity key={g} style={[s.chip, {backgroundColor: genre===g ? c.accent : c.tagBg, borderColor: genre===g ? c.accent : c.border}]} onPress={() => setGenre(g)}>
                <Text style={[s.chipText, {color: genre===g ? '#fff' : c.tagText}]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, {color: c.text2, marginTop: 14}]}>RUH HALİ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
            {MOODS.map(m => (
              <TouchableOpacity key={m} style={[s.chip, {backgroundColor: mood===m ? c.accent : c.tagBg, borderColor: mood===m ? c.accent : c.border}]} onPress={() => setMood(m)}>
                <Text style={[s.chipText, {color: mood===m ? '#fff' : c.tagText}]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity style={[s.submitBtn, {backgroundColor: c.accent}, loading && {opacity:0.6}]} onPress={recommend} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitText}>Kitap Öner →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Results */}
        {books.length > 0 && (
          <View style={s.results}>
            <Text style={[s.resultsTitle, {color: c.text}]}>Öneriler</Text>
            {books.map((b, i) => (
              <View key={i} style={[s.bookCard, {backgroundColor: c.surface, borderColor: c.border}]}>
                <Text style={[s.bookNum, {color: c.accent}]}>ÖNERİ {i+1}</Text>
                <Text style={[s.bookTitle, {color: c.text}]}>{b.title}</Text>
                {b.author  ? <Text style={[s.bookAuthor,  {color: c.text2}]}>{b.author}</Text>  : null}
                {b.genre   ? <View style={[s.genreTag, {backgroundColor: c.tagBg}]}><Text style={[s.genreText, {color: c.tagText}]}>{b.genre}</Text></View> : null}
                {b.summary ? <Text style={[s.bookSummary, {color: c.text2}]}>{b.summary}</Text> : null}

                <TouchableOpacity
                  style={[s.viewBtn, {borderColor: c.border, backgroundColor: c.tagBg}]}
                  onPress={() => viewBook(b.title, b.author, i)}
                  disabled={olLoading[i]}
                >
                  {olLoading[i]
                    ? <ActivityIndicator size="small" color={c.accent} />
                    : <Text style={[s.viewBtnText, {color: c.text2}]}>📖 Kitabı Görüntüle</Text>
                  }
                </TouchableOpacity>

                {olData[i] && !olData[i].error && (
                  <View style={[s.olCard, {backgroundColor: c.bg}]}>
                    <View style={s.olRow}>
                      {olData[i].cover && <Image source={{uri: olData[i].cover}} style={s.olCover} />}
                      <View style={s.olInfo}>
                        <Text style={[s.olTitle, {color: c.text}]}>{olData[i].title}</Text>
                        <Text style={[s.olSub,   {color: c.text2}]}>{olData[i].author}{olData[i].year ? ` · ${olData[i].year}` : ''}</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(olData[i].link)}>
                          <Text style={[s.olLink, {color: c.accent}]}>Open Library'de Gör →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                {olData[i]?.error && <Text style={[s.olError, {color: c.text2}]}>{olData[i].error}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Fallback raw text */}
        {books.length === 0 && rawText.length > 0 && (
          <View style={[s.card, {backgroundColor: c.surface, borderColor: c.border}]}>
            <Text style={[s.bookSummary, {color: c.text}]}>{rawText}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const lightColors = {
  bg: '#F5F0E8', surface: '#FFFFFF', border: '#D9D3C7',
  text: '#1A1A18', text2: '#6B6558', accent: '#C96A2B',
  tagBg: '#E8E0D0', tagText: '#4A4035', inputBg: '#FDFAF5',
  glow: 'rgba(201,106,43,0.1)',
};
const darkColors = {
  bg: '#141210', surface: '#221F1B', border: '#333028',
  text: '#F0EBE0', text2: '#8A8070', accent: '#D4845A',
  tagBg: '#2A2520', tagText: '#B5A898', inputBg: '#1A1713',
  glow: 'rgba(212,132,90,0.15)',
};

const s = StyleSheet.create({
  safe:        {flex:1},
  scroll:      {paddingBottom: 60},
  header:      {flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1},
  logo:        {fontSize:18, fontWeight:'600'},
  themeBtn:    {borderWidth:1, borderRadius:20, paddingHorizontal:12, paddingVertical:6},
  hero:        {alignItems:'center', paddingHorizontal:24, paddingTop:40, paddingBottom:24},
  eyebrow:     {borderWidth:1, borderRadius:20, paddingHorizontal:14, paddingVertical:4, marginBottom:16},
  eyebrowText: {fontSize:11, fontWeight:'600', letterSpacing:0.5},
  heroTitle:   {fontSize:32, fontWeight:'700', textAlign:'center', lineHeight:40, marginBottom:10},
  heroSub:     {fontSize:14, textAlign:'center', lineHeight:22},
  card:        {marginHorizontal:16, marginBottom:16, borderRadius:16, padding:20, borderWidth:1},
  label:       {fontSize:11, fontWeight:'600', letterSpacing:0.5, marginBottom:8},
  input:       {borderWidth:1, borderRadius:10, padding:12, fontSize:14, minHeight:72, textAlignVertical:'top'},
  chipRow:     {flexDirection:'row', marginBottom:4},
  chip:        {borderWidth:1, borderRadius:20, paddingHorizontal:14, paddingVertical:7, marginRight:8},
  chipText:    {fontSize:13},
  submitBtn:   {borderRadius:12, padding:16, alignItems:'center', marginTop:16},
  submitText:  {color:'#fff', fontSize:15, fontWeight:'600'},
  error:       {color:'#DC2626', fontSize:13, marginTop:10},
  results:     {paddingHorizontal:16},
  resultsTitle:{fontSize:20, fontWeight:'700', marginBottom:14},
  bookCard:    {borderRadius:16, padding:20, borderWidth:1, marginBottom:14},
  bookNum:     {fontSize:11, fontWeight:'600', letterSpacing:0.5, marginBottom:6},
  bookTitle:   {fontSize:20, fontWeight:'700', marginBottom:4},
  bookAuthor:  {fontSize:13, marginBottom:10},
  genreTag:    {alignSelf:'flex-start', borderRadius:10, paddingHorizontal:10, paddingVertical:3, marginBottom:10},
  genreText:   {fontSize:11, fontWeight:'600', letterSpacing:0.4},
  bookSummary: {fontSize:14, lineHeight:22, marginBottom:14},
  viewBtn:     {borderWidth:1, borderRadius:8, paddingHorizontal:14, paddingVertical:9, alignSelf:'flex-start'},
  viewBtnText: {fontSize:13},
  olCard:      {marginTop:12, borderRadius:10, padding:12},
  olRow:       {flexDirection:'row', gap:12},
  olCover:     {width:55, height:80, borderRadius:4},
  olInfo:      {flex:1, justifyContent:'center', gap:4},
  olTitle:     {fontSize:14, fontWeight:'600'},
  olSub:       {fontSize:12},
  olLink:      {fontSize:13, fontWeight:'500', marginTop:4},
  olError:     {fontSize:13, marginTop:8},
});
