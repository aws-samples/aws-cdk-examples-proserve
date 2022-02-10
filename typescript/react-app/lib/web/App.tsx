import React, { useEffect, useState } from 'react';

import { NoteType } from '../lambda/notesTable';
import { getNotes, saveNote } from './utils';

const App = () => {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getNotes().then(storedNotes => setNotes(storedNotes));
  }, []);

  const NotesList = () => (
    <aside>
    <h3>Notes <button onClick={() => setModalOpen(true)}>+ Add</button></h3>
    <ul>
      {notes.map(({ subject, date, body }: NoteType, index: number) => (
        <li key={date} onClick={() => setActiveNote(index)} className={index === activeNote ? 'active' : ''}>
          <div className="date">{new Date(date).toLocaleString()}</div>
          <div className="subject">{subject}</div>
          <div className="excerpt">{body?.substring(0, 30) + `...`}</div>
        </li>
      ))}
    </ul>
  </aside>);

  interface NoteProps {
    date: string,

  }

  const AddNew = () => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');  

    const submitForm = async (e: Event) => {
      e.preventDefault();

      if (body && subject) {
        setBody('');
        setSubject('');
        await saveNote({
          date: new Date().toISOString(),
          body,
          subject,
          type: 'note',
        });
        const n = await getNotes();
        setNotes(n);
        setModalOpen(false);
        setActiveNote(0); // New notes are always at the top of the list.
      }
    };

    return (
      <div className="modal-open">
        <form onSubmit={submitForm}>
          <span onClick={() => setModalOpen(false)} className="close-btn">&#10005;</span>
            <input
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            type="text"
            value={subject}
            />
            <textarea
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body"
            value={body}
            ></textarea>
            <input type="submit" value="Save" />
        </form>
      </div>
    )
  }

  const Note = () => {
    const { subject, date, body }: NoteType = notes[activeNote]
    return (
    <main>
      <h2 className="note-title">{subject}</h2>
      <div className="note-date">{new Date(date).toLocaleString()}</div>
      <div className="note-body">{body}</div>
    </main>
  )}

  return (
    <div className="container">
      <NotesList />
      {notes.length > 0 ? <Note /> : <main><p style={{textAlign: 'center'}}>No notes yet. Add one!</p></main>}
      {modalOpen && <AddNew />}
    </div>
  );
};

export default App;