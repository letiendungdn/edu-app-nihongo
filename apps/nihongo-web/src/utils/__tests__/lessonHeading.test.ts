import { describe, expect, it } from 'vitest';
import { splitLessonHeading } from '../lessonHeading';

describe('splitLessonHeading', () => {
  it('splits the section name from the textbook name', () => {
    expect(splitLessonHeading('Từ vựng Minna no Nihongo')).toEqual({ lead: 'Từ vựng', rest: 'Minna no Nihongo' });
    expect(splitLessonHeading('Ngữ pháp JLPT N3')).toEqual({ lead: 'Ngữ pháp', rest: 'JLPT N3' });
  });

  it('keeps other titles whole', () => {
    expect(splitLessonHeading('Kanji')).toEqual({ lead: 'Kanji', rest: '' });
  });
});
