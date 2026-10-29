// 상식퀴즈 문제 데이터 (카테고리별 20문제, 총 80문제)
// correctAnswer: options 배열의 정답 인덱스 (0부터 시작)
const QUESTIONS = [
  // ===== 한국사 =====
  {
    id: 1,
    category: "한국사",
    difficulty: "easy",
    question: "조선을 건국한 왕은?",
    options: ["이성계", "왕건", "이방원", "세종"],
    correctAnswer: 0,
    explanation: "이성계는 1392년 조선을 건국했습니다."
  },
  {
    id: 2,
    category: "한국사",
    difficulty: "easy",
    question: "훈민정음을 창제한 왕은?",
    options: ["태종", "세종", "성종", "정조"],
    correctAnswer: 1,
    explanation: "세종대왕은 1443년 훈민정음을 창제하고 1446년에 반포했습니다."
  },
  {
    id: 3,
    category: "한국사",
    difficulty: "easy",
    question: "고려를 건국한 인물은?",
    options: ["견훤", "궁예", "왕건", "김춘추"],
    correctAnswer: 2,
    explanation: "왕건은 918년 고려를 건국하고 936년 후삼국을 통일했습니다."
  },
  {
    id: 4,
    category: "한국사",
    difficulty: "easy",
    question: "임진왜란 때 한산도 대첩을 승리로 이끈 장군은?",
    options: ["권율", "이순신", "김시민", "곽재우"],
    correctAnswer: 1,
    explanation: "이순신 장군은 1592년 한산도 대첩에서 학익진 전법으로 왜군을 크게 물리쳤습니다."
  },
  {
    id: 5,
    category: "한국사",
    difficulty: "medium",
    question: "3·1 운동이 일어난 해는?",
    options: ["1910년", "1919년", "1926년", "1945년"],
    correctAnswer: 1,
    explanation: "3·1 운동은 1919년 3월 1일 일제의 식민 통치에 맞서 일어난 전국적인 독립운동입니다."
  },
  {
    id: 6,
    category: "한국사",
    difficulty: "hard",
    question: "당나라 세력을 몰아내고 신라의 삼국 통일을 완성한 왕은?",
    options: ["무열왕", "진흥왕", "문무왕", "신문왕"],
    correctAnswer: 2,
    explanation: "문무왕은 676년 당나라 군대를 몰아내고 삼국 통일을 완성했습니다."
  },
  {
    id: 7,
    category: "한국사",
    difficulty: "medium",
    question: "고구려의 영토를 크게 넓혔으며, 아들 장수왕이 세운 비석으로 유명한 왕은?",
    options: ["광개토대왕", "소수림왕", "고국천왕", "미천왕"],
    correctAnswer: 0,
    explanation: "광개토대왕은 고구려의 영토를 크게 확장했으며, 그 업적은 광개토대왕릉비에 기록되어 있습니다."
  },
  {
    id: 8,
    category: "한국사",
    difficulty: "medium",
    question: "1919년 대한민국 임시정부가 처음 수립된 도시는?",
    options: ["베이징", "충칭", "상하이", "도쿄"],
    correctAnswer: 2,
    explanation: "대한민국 임시정부는 1919년 중국 상하이에서 수립되었습니다."
  },
  {
    id: 9,
    category: "한국사",
    difficulty: "medium",
    question: "팔만대장경이 보관되어 있는 사찰은?",
    options: ["불국사", "해인사", "통도사", "송광사"],
    correctAnswer: 1,
    explanation: "팔만대장경은 경상남도 합천 해인사의 장경판전에 보관되어 있습니다."
  },
  {
    id: 10,
    category: "한국사",
    difficulty: "easy",
    question: "6·25 전쟁이 발발한 해는?",
    options: ["1945년", "1948년", "1950년", "1953년"],
    correctAnswer: 2,
    explanation: "6·25 전쟁은 1950년 6월 25일에 발발해 1953년 정전 협정으로 휴전되었습니다."
  },

  // ===== 과학 =====
  {
    id: 11,
    category: "과학",
    difficulty: "easy",
    question: "물의 화학식은?",
    options: ["CO₂", "H₂O", "O₂", "NaCl"],
    correctAnswer: 1,
    explanation: "물은 수소 원자 2개와 산소 원자 1개로 이루어져 있어 H₂O로 표기합니다."
  },
  {
    id: 12,
    category: "과학",
    difficulty: "easy",
    question: "지름 기준으로, 태양계에서 가장 큰 행성은?",
    options: ["토성", "지구", "목성", "해왕성"],
    correctAnswer: 2,
    explanation: "목성은 지름이 지구의 약 11배로 태양계에서 가장 큰 행성이며, 질량도 가장 큽니다."
  },
  {
    id: 13,
    category: "과학",
    difficulty: "medium",
    question: "진공에서 빛의 속도는 대략 초속 몇 km인가?",
    options: ["약 3만 km", "약 30만 km", "약 300만 km", "약 3천 km"],
    correctAnswer: 1,
    explanation: "빛의 속도는 초속 약 30만 km(정확히는 299,792.458 km)입니다."
  },
  {
    id: 14,
    category: "과학",
    difficulty: "medium",
    question: "면적과 무게 기준으로, 사람 몸에서 가장 큰 기관은?",
    options: ["간", "피부", "폐", "뇌"],
    correctAnswer: 1,
    explanation: "피부는 성인 기준 면적 약 1.5~2m²로 인체에서 가장 큰 기관입니다. 몸속 장기 중에서는 간이 가장 큽니다."
  },
  {
    id: 15,
    category: "과학",
    difficulty: "medium",
    question: "원소 기호 'Fe'가 나타내는 원소는?",
    options: ["불소", "철", "금", "납"],
    correctAnswer: 1,
    explanation: "Fe는 라틴어 'Ferrum'에서 유래한 철의 원소 기호입니다."
  },
  {
    id: 16,
    category: "과학",
    difficulty: "easy",
    question: "식물이 빛 에너지를 이용해 양분을 만드는 과정은?",
    options: ["호흡", "증산 작용", "광합성", "발효"],
    correctAnswer: 2,
    explanation: "광합성은 빛 에너지로 이산화탄소와 물을 이용해 포도당과 산소를 만드는 과정입니다."
  },
  {
    id: 17,
    category: "과학",
    difficulty: "easy",
    question: "상대성 이론을 발표한 과학자는?",
    options: ["뉴턴", "아인슈타인", "갈릴레이", "퀴리"],
    correctAnswer: 1,
    explanation: "아인슈타인은 1905년 특수 상대성 이론, 1915년 일반 상대성 이론을 발표했습니다."
  },
  {
    id: 18,
    category: "과학",
    difficulty: "easy",
    question: "1기압에서 물이 끓는 온도는?",
    options: ["0°C", "50°C", "100°C", "212°C"],
    correctAnswer: 2,
    explanation: "1기압에서 물은 100°C(화씨 212°F)에서 끓습니다."
  },
  {
    id: 19,
    category: "과학",
    difficulty: "easy",
    question: "태양에서 가장 가까운 행성은?",
    options: ["금성", "화성", "수성", "지구"],
    correctAnswer: 2,
    explanation: "수성은 태양에서 가장 가까운 행성이며, 태양계에서 가장 작은 행성이기도 합니다."
  },
  {
    id: 20,
    category: "과학",
    difficulty: "hard",
    question: "1953년 DNA의 이중 나선 구조를 밝힌 과학자들은?",
    options: ["왓슨과 크릭", "멘델과 다윈", "파스퇴르와 코흐", "보어와 러더퍼드"],
    correctAnswer: 0,
    explanation: "제임스 왓슨과 프랜시스 크릭은 1953년 DNA 이중 나선 구조 모델을 발표했습니다. 로절린드 프랭클린의 X선 회절 사진이 결정적인 근거가 되었습니다."
  },

  // ===== 지리 =====
  {
    id: 21,
    category: "지리",
    difficulty: "easy",
    question: "면적이 세계에서 가장 넓은 나라는?",
    options: ["캐나다", "중국", "미국", "러시아"],
    correctAnswer: 3,
    explanation: "러시아는 약 1,710만 km²로 세계에서 가장 넓은 나라입니다."
  },
  {
    id: 22,
    category: "지리",
    difficulty: "easy",
    question: "해발 고도 기준으로, 세계에서 가장 높은 산은?",
    options: ["K2", "에베레스트산", "킬리만자로산", "몽블랑"],
    correctAnswer: 1,
    explanation: "에베레스트산은 해발 약 8,849m(2020년 중국·네팔 공동 측정 8,848.86m)로 세계에서 가장 높은 산입니다."
  },
  {
    id: 23,
    category: "지리",
    difficulty: "easy",
    question: "해발 고도 기준으로, 남한에서 가장 높은 산은?",
    options: ["지리산", "설악산", "한라산", "태백산"],
    correctAnswer: 2,
    explanation: "제주도의 한라산은 해발 1,947m로 남한에서 가장 높은 산입니다."
  },
  {
    id: 24,
    category: "지리",
    difficulty: "easy",
    question: "면적 기준으로, 세계에서 가장 넓은 대양은?",
    options: ["대서양", "인도양", "태평양", "북극해"],
    correctAnswer: 2,
    explanation: "태평양은 지구 표면의 약 3분의 1을 차지하는 가장 넓은 대양입니다."
  },
  {
    id: 25,
    category: "지리",
    difficulty: "medium",
    question: "호주의 수도는?",
    options: ["시드니", "멜버른", "캔버라", "퍼스"],
    correctAnswer: 2,
    explanation: "호주의 수도는 캔버라입니다. 시드니는 가장 큰 도시이지만 수도는 아닙니다."
  },
  {
    id: 26,
    category: "지리",
    difficulty: "medium",
    question: "다음 중 면적이 가장 넓은 사막은?",
    options: ["고비 사막", "사하라 사막", "아라비아 사막", "칼라하리 사막"],
    correctAnswer: 1,
    explanation: "보기 중에서는 사하라 사막이 가장 넓습니다. 사하라는 남극·북극 같은 극지 사막을 빼면 세계에서 가장 넓은 사막입니다."
  },
  {
    id: 27,
    category: "지리",
    difficulty: "medium",
    question: "길이 기준으로, 남한에서 가장 긴 강은?",
    options: ["한강", "금강", "영산강", "낙동강"],
    correctAnswer: 3,
    explanation: "낙동강은 길이 약 510km로 남한에서 가장 긴 강입니다. 한강은 북한 지역을 포함해도 약 494km입니다."
  },
  {
    id: 28,
    category: "지리",
    difficulty: "medium",
    question: "캐나다의 수도는?",
    options: ["토론토", "밴쿠버", "몬트리올", "오타와"],
    correctAnswer: 3,
    explanation: "캐나다의 수도는 온타리오주에 있는 오타와입니다."
  },
  {
    id: 29,
    category: "지리",
    difficulty: "hard",
    question: "2023년 UN 추계 기준, 인구가 세계에서 가장 많은 나라는?",
    options: ["중국", "인도", "미국", "인도네시아"],
    correctAnswer: 1,
    explanation: "UN 추계에 따르면 인도는 2023년 중국을 넘어 인구가 가장 많은 나라가 되었습니다."
  },
  {
    id: 30,
    category: "지리",
    difficulty: "medium",
    question: "길이 기준으로, 아프리카에서 가장 긴 강은?",
    options: ["콩고강", "나일강", "니제르강", "잠베지강"],
    correctAnswer: 1,
    explanation: "나일강은 길이 약 6,650km로 아프리카에서 가장 긴 강입니다."
  },

  // ===== 문화·예술 =====
  {
    id: 31,
    category: "문화·예술",
    difficulty: "easy",
    question: "'모나리자'를 그린 화가는?",
    options: ["미켈란젤로", "레오나르도 다 빈치", "라파엘로", "렘브란트"],
    correctAnswer: 1,
    explanation: "모나리자는 레오나르도 다 빈치의 작품으로, 프랑스 루브르 박물관에 소장되어 있습니다."
  },
  {
    id: 32,
    category: "문화·예술",
    difficulty: "easy",
    question: "'로미오와 줄리엣'을 쓴 작가는?",
    options: ["셰익스피어", "괴테", "톨스토이", "디킨스"],
    correctAnswer: 0,
    explanation: "로미오와 줄리엣은 영국의 극작가 윌리엄 셰익스피어의 비극입니다."
  },
  {
    id: 33,
    category: "문화·예술",
    difficulty: "medium",
    question: "베토벤 교향곡 제9번의 별칭은?",
    options: ["운명", "전원", "영웅", "합창"],
    correctAnswer: 3,
    explanation: "교향곡 9번은 4악장에 '환희의 송가' 합창이 들어 있어 '합창 교향곡'으로 불립니다."
  },
  {
    id: 34,
    category: "문화·예술",
    difficulty: "easy",
    question: "'별이 빛나는 밤'과 '해바라기'를 그린 화가는?",
    options: ["클로드 모네", "파블로 피카소", "빈센트 반 고흐", "폴 세잔"],
    correctAnswer: 2,
    explanation: "두 작품 모두 네덜란드 출신 화가 빈센트 반 고흐의 대표작입니다."
  },
  {
    id: 35,
    category: "문화·예술",
    difficulty: "easy",
    question: "올림픽 오륜기에 그려진 원은 모두 몇 개인가?",
    options: ["4개", "5개", "6개", "7개"],
    correctAnswer: 1,
    explanation: "오륜기의 다섯 개 고리는 다섯 대륙의 화합을 상징합니다."
  },
  {
    id: 36,
    category: "문화·예술",
    difficulty: "medium",
    question: "김만중이 지은 고전 소설로, 성진이 꿈속에서 부귀영화를 누리는 이야기는?",
    options: ["춘향전", "홍길동전", "구운몽", "심청전"],
    correctAnswer: 2,
    explanation: "구운몽은 조선 숙종 때 김만중이 지은 소설로, 인생의 부귀영화가 한낱 꿈과 같다는 주제를 담고 있습니다."
  },
  {
    id: 37,
    category: "문화·예술",
    difficulty: "hard",
    question: "현대의 표준 피아노 건반은 모두 몇 개인가?",
    options: ["76개", "82개", "88개", "96개"],
    correctAnswer: 2,
    explanation: "표준 피아노는 흰 건반 52개와 검은 건반 36개, 모두 88개의 건반으로 되어 있습니다."
  },
  {
    id: 38,
    category: "문화·예술",
    difficulty: "medium",
    question: "'어린 왕자'를 쓴 작가는?",
    options: ["생텍쥐페리", "빅토르 위고", "알베르 카뮈", "헤르만 헤세"],
    correctAnswer: 0,
    explanation: "어린 왕자는 프랑스의 작가이자 비행사인 앙투안 드 생텍쥐페리가 1943년에 발표했습니다."
  },
  {
    id: 39,
    category: "문화·예술",
    difficulty: "easy",
    question: "2002년 FIFA 월드컵을 공동 개최한 나라는?",
    options: ["한국과 중국", "한국과 일본", "일본과 중국", "한국과 미국"],
    correctAnswer: 1,
    explanation: "2002년 FIFA 월드컵은 한국과 일본이 공동 개최한 첫 아시아 월드컵입니다."
  },
  {
    id: 40,
    category: "문화·예술",
    difficulty: "hard",
    question: "다음 중 판소리 다섯 마당에 속하지 않는 것은?",
    options: ["춘향가", "심청가", "적벽가", "아리랑"],
    correctAnswer: 3,
    explanation: "판소리 다섯 마당은 춘향가, 심청가, 흥보가, 수궁가, 적벽가입니다. 아리랑은 민요입니다."
  },

  // ===== 한국사 (확장) =====
  {
    id: 41,
    category: "한국사",
    difficulty: "easy",
    question: "고조선을 건국했다고 전해지는 인물은?",
    options: ["주몽", "단군왕검", "온조", "박혁거세"],
    correctAnswer: 1,
    explanation: "삼국유사에 따르면 단군왕검이 기원전 2333년에 고조선을 건국했다고 전해집니다."
  },
  {
    id: 42,
    category: "한국사",
    difficulty: "medium",
    question: "1894년 동학 농민 운동을 이끈 인물은?",
    options: ["최제우", "김옥균", "전봉준", "흥선대원군"],
    correctAnswer: 2,
    explanation: "전봉준은 1894년 동학 농민 운동을 이끈 지도자로 '녹두장군'이라 불렸습니다."
  },
  {
    id: 43,
    category: "한국사",
    difficulty: "medium",
    question: "수원 화성을 축조한 조선의 왕은?",
    options: ["영조", "정조", "숙종", "광해군"],
    correctAnswer: 1,
    explanation: "정조는 수원 화성을 쌓게 했으며, 화성은 1796년에 완공되었습니다."
  },
  {
    id: 44,
    category: "한국사",
    difficulty: "hard",
    question: "고려 시대 몽골의 침입에 맞서 끝까지 항쟁한 군사 조직은?",
    options: ["별무반", "삼별초", "광군", "속오군"],
    correctAnswer: 1,
    explanation: "삼별초는 고려가 몽골과 강화한 뒤에도 강화도, 진도, 제주도로 옮겨 가며 항쟁했습니다."
  },
  {
    id: 45,
    category: "한국사",
    difficulty: "medium",
    question: "백제의 마지막 왕은?",
    options: ["무령왕", "성왕", "근초고왕", "의자왕"],
    correctAnswer: 3,
    explanation: "의자왕은 660년 나당 연합군에 의해 백제가 멸망할 때의 마지막 왕입니다."
  },
  {
    id: 46,
    category: "한국사",
    difficulty: "easy",
    question: "대한민국의 한글날은 몇 월 며칠인가?",
    options: ["3월 1일", "8월 15일", "10월 3일", "10월 9일"],
    correctAnswer: 3,
    explanation: "한글날은 훈민정음 반포를 기념하는 날로 10월 9일입니다. 북한은 1월 15일을 조선글날로 기념합니다."
  },
  {
    id: 47,
    category: "한국사",
    difficulty: "medium",
    question: "강우량을 재는 측우기가 만들어진 때의 왕은?",
    options: ["세종", "태조", "성종", "영조"],
    correctAnswer: 0,
    explanation: "측우기는 세종 때인 1441년에 만들어졌습니다."
  },
  {
    id: 48,
    category: "한국사",
    difficulty: "easy",
    question: "광복절은 몇 월 며칠인가?",
    options: ["3월 1일", "6월 25일", "8월 15일", "10월 3일"],
    correctAnswer: 2,
    explanation: "광복절은 1945년 8월 15일 일제로부터 해방된 것을 기념하는 날입니다."
  },
  {
    id: 49,
    category: "한국사",
    difficulty: "medium",
    question: "1909년 안중근 의사가 이토 히로부미를 저격한 장소는?",
    options: ["하얼빈역", "상하이 홍커우 공원", "도쿄역", "서울역"],
    correctAnswer: 0,
    explanation: "안중근 의사는 1909년 10월 26일 만주 하얼빈역에서 이토 히로부미를 저격했습니다."
  },
  {
    id: 50,
    category: "한국사",
    difficulty: "medium",
    question: "698년 발해를 건국한 인물은?",
    options: ["연개소문", "대조영", "을지문덕", "장보고"],
    correctAnswer: 1,
    explanation: "대조영은 698년 고구려 유민과 말갈인을 이끌고 발해를 건국했습니다."
  },

  // ===== 과학 (확장) =====
  {
    id: 51,
    category: "과학",
    difficulty: "medium",
    question: "건조한 공기의 부피 기준으로, 지구 대기에서 가장 많은 기체는?",
    options: ["산소", "이산화탄소", "질소", "아르곤"],
    correctAnswer: 2,
    explanation: "건조한 공기의 부피 기준으로 질소는 약 78%, 산소는 약 21%를 차지합니다."
  },
  {
    id: 52,
    category: "과학",
    difficulty: "easy",
    question: "소리가 전달되지 않는 곳은?",
    options: ["물속", "공기 중", "진공", "쇠막대"],
    correctAnswer: 2,
    explanation: "소리는 매질의 진동으로 전달되므로 매질이 없는 진공에서는 전달되지 않습니다."
  },
  {
    id: 53,
    category: "과학",
    difficulty: "medium",
    question: "1869년 원소 주기율표를 발표한 과학자는?",
    options: ["멘델레예프", "라부아지에", "돌턴", "보일"],
    correctAnswer: 0,
    explanation: "러시아의 화학자 멘델레예프는 1869년 원소를 원자량 순으로 배열한 주기율표를 발표했습니다."
  },
  {
    id: 54,
    category: "과학",
    difficulty: "easy",
    question: "혈액에서 산소를 운반하는 세포는?",
    options: ["백혈구", "적혈구", "혈소판", "신경 세포"],
    correctAnswer: 1,
    explanation: "적혈구 속의 헤모글로빈이 산소와 결합해 온몸으로 산소를 운반합니다."
  },
  {
    id: 55,
    category: "과학",
    difficulty: "easy",
    question: "만유인력의 법칙을 발견한 과학자는?",
    options: ["갈릴레이", "케플러", "뉴턴", "코페르니쿠스"],
    correctAnswer: 2,
    explanation: "아이작 뉴턴은 1687년 '프린키피아'에서 만유인력의 법칙을 발표했습니다."
  },
  {
    id: 56,
    category: "과학",
    difficulty: "medium",
    question: "다이아몬드를 이루는 원소는?",
    options: ["규소", "탄소", "질소", "수소"],
    correctAnswer: 1,
    explanation: "다이아몬드는 탄소 원자로만 이루어져 있으며, 흑연과 같은 원소로 된 동소체입니다."
  },
  {
    id: 57,
    category: "과학",
    difficulty: "hard",
    question: "오존층이 있는 대기층은?",
    options: ["대류권", "성층권", "중간권", "열권"],
    correctAnswer: 1,
    explanation: "오존층은 성층권에 있으며 태양의 자외선을 흡수해 생명체를 보호합니다."
  },
  {
    id: 58,
    category: "과학",
    difficulty: "medium",
    question: "25°C에서 pH 7인 수용액의 성질은?",
    options: ["강한 산성", "약한 산성", "중성", "염기성"],
    correctAnswer: 2,
    explanation: "25°C에서 pH 7은 중성이며, 7보다 작으면 산성, 크면 염기성입니다. 중성 pH 값은 온도에 따라 조금 달라집니다."
  },
  {
    id: 59,
    category: "과학",
    difficulty: "easy",
    question: "'붉은 행성'이라고 불리는 행성은?",
    options: ["금성", "화성", "목성", "토성"],
    correctAnswer: 1,
    explanation: "화성은 표면의 산화철 때문에 붉게 보여 '붉은 행성'이라고 불립니다."
  },
  {
    id: 60,
    category: "과학",
    difficulty: "hard",
    question: "성인의 몸을 이루는 뼈는 대략 몇 개인가?",
    options: ["106개", "206개", "306개", "406개"],
    correctAnswer: 1,
    explanation: "성인의 뼈는 약 206개입니다. 신생아는 300개 가까이 되지만 자라면서 일부가 합쳐집니다."
  },

  // ===== 지리 (확장) =====
  {
    id: 61,
    category: "지리",
    difficulty: "easy",
    question: "일본의 수도는?",
    options: ["오사카", "교토", "도쿄", "요코하마"],
    correctAnswer: 2,
    explanation: "일본의 수도는 도쿄입니다."
  },
  {
    id: 62,
    category: "지리",
    difficulty: "medium",
    question: "길이 기준으로, 남아메리카에서 가장 긴 강은?",
    options: ["아마존강", "파라나강", "오리노코강", "미시시피강"],
    correctAnswer: 0,
    explanation: "아마존강은 남아메리카에서 가장 긴 강이며, 유량은 세계에서 가장 많습니다."
  },
  {
    id: 63,
    category: "지리",
    difficulty: "easy",
    question: "면적 기준으로, 우리나라에서 가장 큰 섬은?",
    options: ["거제도", "제주도", "강화도", "울릉도"],
    correctAnswer: 1,
    explanation: "제주도는 면적 약 1,850km²로 우리나라에서 가장 큰 섬입니다."
  },
  {
    id: 64,
    category: "지리",
    difficulty: "medium",
    question: "독도가 속한 행정 구역은?",
    options: ["강원특별자치도 강릉시", "경상북도 울릉군", "경상북도 포항시", "울산광역시"],
    correctAnswer: 1,
    explanation: "독도의 주소는 경상북도 울릉군 울릉읍 독도리입니다."
  },
  {
    id: 65,
    category: "지리",
    difficulty: "medium",
    question: "이집트의 수도는?",
    options: ["알렉산드리아", "카이로", "룩소르", "기자"],
    correctAnswer: 1,
    explanation: "이집트의 공식 수도는 나일강 하류에 있는 카이로입니다. 동쪽에 신행정수도를 짓고 정부 기관을 옮기고 있지만 수도는 바뀌지 않았습니다."
  },
  {
    id: 66,
    category: "지리",
    difficulty: "medium",
    question: "면적 기준으로, 세계에서 가장 큰 섬은? (대륙 제외)",
    options: ["보르네오섬", "마다가스카르섬", "그린란드", "뉴기니섬"],
    correctAnswer: 2,
    explanation: "그린란드는 약 216만 km²로 세계에서 가장 큰 섬입니다. 호주는 대륙으로 분류됩니다."
  },
  {
    id: 67,
    category: "지리",
    difficulty: "medium",
    question: "브라질의 공용어는?",
    options: ["스페인어", "포르투갈어", "영어", "프랑스어"],
    correctAnswer: 1,
    explanation: "브라질은 포르투갈의 식민지였기 때문에 포르투갈어를 공용어로 씁니다."
  },
  {
    id: 68,
    category: "지리",
    difficulty: "hard",
    question: "다음 중 적도가 지나지 않는 나라는?",
    options: ["에콰도르", "케냐", "인도네시아", "이집트"],
    correctAnswer: 3,
    explanation: "이집트는 북위 약 22~32도에 있어 적도가 지나지 않습니다."
  },
  {
    id: 69,
    category: "지리",
    difficulty: "hard",
    question: "최대 수심 기준으로, 세계에서 가장 깊은 해구는?",
    options: ["마리아나 해구", "통가 해구", "일본 해구", "푸에르토리코 해구"],
    correctAnswer: 0,
    explanation: "태평양의 마리아나 해구는 가장 깊은 곳(챌린저 해연)이 약 11,000m에 이릅니다."
  },
  {
    id: 70,
    category: "지리",
    difficulty: "hard",
    question: "뉴질랜드의 수도는?",
    options: ["오클랜드", "크라이스트처치", "웰링턴", "퀸스타운"],
    correctAnswer: 2,
    explanation: "뉴질랜드의 수도는 웰링턴입니다. 가장 큰 도시는 오클랜드입니다."
  },

  // ===== 문화·예술 (확장) =====
  {
    id: 71,
    category: "문화·예술",
    difficulty: "medium",
    question: "시스티나 성당의 천장화 '천지창조'를 그린 화가는?",
    options: ["미켈란젤로", "라파엘로", "보티첼리", "카라바조"],
    correctAnswer: 0,
    explanation: "미켈란젤로는 1508년부터 1512년까지 시스티나 성당 천장화를 그렸습니다."
  },
  {
    id: 72,
    category: "문화·예술",
    difficulty: "medium",
    question: "대하소설 '토지'를 쓴 작가는?",
    options: ["박완서", "박경리", "조정래", "최명희"],
    correctAnswer: 1,
    explanation: "박경리는 1969년부터 1994년까지 25년에 걸쳐 '토지'를 완성했습니다."
  },
  {
    id: 73,
    category: "문화·예술",
    difficulty: "easy",
    question: "'운명 교향곡'으로 알려진 교향곡 5번의 작곡가는?",
    options: ["모차르트", "바흐", "베토벤", "슈베르트"],
    correctAnswer: 2,
    explanation: "베토벤의 교향곡 5번은 첫머리의 '따따따 딴' 동기로 유명하며 '운명'이라는 별칭으로 불립니다."
  },
  {
    id: 74,
    category: "문화·예술",
    difficulty: "medium",
    question: "오페라 '마술피리'를 작곡한 사람은?",
    options: ["모차르트", "바그너", "푸치니", "헨델"],
    correctAnswer: 0,
    explanation: "'마술피리'는 모차르트가 1791년, 생을 마치기 몇 달 전에 초연한 오페라입니다."
  },
  {
    id: 75,
    category: "문화·예술",
    difficulty: "easy",
    question: "'해리 포터' 시리즈를 쓴 작가는?",
    options: ["J.R.R. 톨킨", "C.S. 루이스", "J.K. 롤링", "로알드 달"],
    correctAnswer: 2,
    explanation: "'해리 포터' 시리즈는 영국 작가 J.K. 롤링이 1997년부터 발표했습니다."
  },
  {
    id: 76,
    category: "문화·예술",
    difficulty: "easy",
    question: "2024년 한국인 최초로 노벨 문학상을 받은 작가는?",
    options: ["한강", "고은", "황석영", "김영하"],
    correctAnswer: 0,
    explanation: "한강 작가는 2024년 노벨 문학상을 받았으며, 아시아 여성 작가로서도 처음입니다."
  },
  {
    id: 77,
    category: "문화·예술",
    difficulty: "hard",
    question: "오페라 '라 트라비아타'를 작곡한 사람은?",
    options: ["푸치니", "베르디", "로시니", "비제"],
    correctAnswer: 1,
    explanation: "'라 트라비아타'는 이탈리아 작곡가 주세페 베르디가 1853년에 발표한 오페라입니다."
  },
  {
    id: 78,
    category: "문화·예술",
    difficulty: "medium",
    question: "그림 '절규'를 그린 화가는?",
    options: ["구스타프 클림트", "에드바르 뭉크", "에곤 실레", "앙리 마티스"],
    correctAnswer: 1,
    explanation: "'절규'는 노르웨이 화가 에드바르 뭉크의 대표작입니다."
  },
  {
    id: 79,
    category: "문화·예술",
    difficulty: "easy",
    question: "석굴암과 불국사가 있는 도시는?",
    options: ["경주", "부여", "공주", "안동"],
    correctAnswer: 0,
    explanation: "석굴암과 불국사는 경주에 있으며, 1995년 함께 유네스코 세계유산에 등재되었습니다."
  },
  {
    id: 80,
    category: "문화·예술",
    difficulty: "hard",
    question: "소설 '돈키호테'를 쓴 작가는?",
    options: ["세르반테스", "단테", "보카치오", "몰리에르"],
    correctAnswer: 0,
    explanation: "'돈키호테'는 스페인 작가 미겔 데 세르반테스가 1605년과 1615년에 나누어 발표했습니다."
  }
];

const CATEGORIES = ["한국사", "과학", "지리", "문화·예술"];

// 카테고리·난이도별 문제 필터링 ("전체"/"all"이면 해당 조건 미적용, id 순서 유지)
function getQuestionsByCategory(category, difficulty) {
  return QUESTIONS.filter((q) =>
    (!category || category === "전체" || q.category === category) &&
    (!difficulty || difficulty === "all" || q.difficulty === difficulty)
  );
}

// Node 환경에서 검증 스크립트로 불러올 수 있도록 내보내기
if (typeof module !== "undefined" && module.exports) {
  module.exports = { QUESTIONS, CATEGORIES, getQuestionsByCategory };
}
