import { expect } from 'chai';

import 'mocha';
import { fold } from '../../main/utils/emailUtils';


describe('email util tests', () => {
  it("test folding", () => {
    let data = "Content-Type: multipart/alternative; boundary=\"----=_Part_133510_1144981925.1684118870354\""
    let expected = "Content-Type: multipart/alternative;\r\n\tboundary=\"----=_Part_133510_1144981925.1684118870354\""

    let actual = fold(data)
    expect(actual).to.eq(expected)
  });

});
