import { expect } from 'chai';

import 'mocha';
import { fold as fold, parseReceived } from '../../main/utils/emailUtils';


describe('email util tests', () => {
  it("test folding", () => {
    let data = "Content-Type: multipart/alternative; boundary=\"----=_Part_133510_1144981925.1684118870354\""
    let expected = "Content-Type: multipart/alternative;\r\n\tboundary=\"----=_Part_133510_1144981925.1684118870354\""

    let actual = fold(data)
    expect(actual).to.eq(expected)
  });

  [
    {
      received: " from abc123-h1p-99999.sys.test.net (abc123-h1p-99999.sys.test.net [32.100.200.10])\
        !! by inbound-smtp.us-west-2.amazonaws.com with SMTP id 91823689101239fhj3b3kja92\
        !! for local@test.com;\
        !! Mon, 15 May 2023 02:47:52 +0000 (UTC)".replace(/\s*!!/g, ""),
      expected: {
        from: "abc123-h1p-99999.sys.test.net (abc123-h1p-99999.sys.test.net [32.100.200.10])",
        by: "inbound-smtp.us-west-2.amazonaws.com",
        via: undefined,
        with: "SMTP",
        id: "91823689101239fhj3b3kja92",
        for: "local@test.com",
        date: "Mon, 15 May 2023 02:47:52 +0000 (UTC)"
      }
    },
    {
      received: " from oxapp-hob-32o.email.comcast.net ([96.118.25.247])\
        !! (using TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384 256/256 bits)\
        !! (Client did not present a certificate)\
        !! by resomta-h1p-027915.sys.comcast.net with ESMTPS\
        !! id yOFapZpIypHyQyOFapG6vT; Mon, 15 May 2023 02:47:50 +0000".replace(/\s*!!/g, ""),
      expected: {
        from: "oxapp-hob-32o.email.comcast.net ([96.118.25.247]) (using TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384 256/256 bits) (Client did not present a certificate)",
        by: "resomta-h1p-027915.sys.comcast.net",
        via: undefined,
        with: "ESMTPS",
        id: "yOFapZpIypHyQyOFapG6vT",
        for: undefined,
        date: "Mon, 15 May 2023 02:47:50 +0000"
      }
    }
  ].forEach(test => {
    it(`test parsing received: ${test.received}`, () => {
      var actual = parseReceived(test.received)

      expect(actual.for).eq(test.expected.for)
      expect(actual.by).eq(test.expected.by)
      expect(actual.via).eq(test.expected.via)
      expect(actual.with).eq(test.expected.with)
      expect(actual.id).eq(test.expected.id)
      expect(actual.for).eq(test.expected.for)
      expect(actual.date).eq(test.expected.date)
    });
  });
});
