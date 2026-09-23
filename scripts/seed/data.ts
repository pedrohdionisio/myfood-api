import type { IShift } from '@/domain/opening-hours.js'

export const SEED_PASSWORD = 'Senha@12345'

export interface ISeedPerson {
  name: string
  email: string
  phone: string
}

export interface ISeedAddress {
  label: string
  zipCode: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  reference?: string
}

export interface ISeedCustomer extends ISeedPerson {
  addresses: ISeedAddress[]
}

export interface ISeedDriver extends ISeedPerson {
  deactivate?: boolean
}

export interface ISeedProduct {
  name: string
  description: string
  priceCents: number
  top?: boolean
  unavailable?: boolean
  archived?: boolean
}

export interface ISeedMenuCategory {
  name: string
  kind: 'main' | 'side'
  products: ISeedProduct[]
}

export interface ISeedRestaurant {
  ownerEmail: string
  coOwnerEmails: string[]
  tradeName: string
  legalName: string
  cnpj: string
  phone: string
  email: string
  description: string
  address: Omit<ISeedAddress, 'label' | 'reference'>
  deliveryFeeCents: number
  minOrderCents: number
  avgPrepTimeMin: number
  cuisineSlugs: string[]
  shifts: IShift[]
  activate: boolean
  acceptingOrders: boolean
  drivers: ISeedDriver[]
  ratingBias: number
  ordersPerDay: [number, number]
  menu: ISeedMenuCategory[]
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function shifts(days: number[], opensAt: string, closesAt: string): IShift[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, opensAt, closesAt }))
}

export const OWNERS: ISeedPerson[] = [
  { name: 'Marcos Tavares', email: 'marcos.brasa@myfood.dev', phone: '11981110001' },
  { name: 'Juliana Prado', email: 'juliana.rei@myfood.dev', phone: '11981110002' },
  { name: 'Rosa Bianchi', email: 'rosa.nonna@myfood.dev', phone: '11981110003' },
  { name: 'Rafael Moura', email: 'rafael.pizza@myfood.dev', phone: '11981110004' },
  { name: 'Gustavo Pereira', email: 'gustavo.fogo@myfood.dev', phone: '11981110005' },
  { name: 'Helena Campos', email: 'helena.tempero@myfood.dev', phone: '19981110006' }
]

const CARLOS: ISeedDriver = {
  name: 'Carlos Mendes',
  email: 'carlos.entregas@myfood.dev',
  phone: '11982220001'
}

const SAO_PAULO = { city: 'São Paulo', state: 'SP' }
const CAMPINAS = { city: 'Campinas', state: 'SP' }

export const CUSTOMERS: ISeedCustomer[] = [
  {
    name: 'Ana Souza',
    email: 'ana.souza@myfood.dev',
    phone: '11983330001',
    addresses: [
      {
        label: 'Casa',
        zipCode: '01310200',
        street: 'Avenida Paulista',
        number: '1578',
        complement: 'Apto 82',
        neighborhood: 'Bela Vista',
        ...SAO_PAULO,
        reference: 'Portaria 24h'
      },
      {
        label: 'Trabalho',
        zipCode: '04538133',
        street: 'Avenida Brigadeiro Faria Lima',
        number: '3477',
        complement: '14º andar',
        neighborhood: 'Itaim Bibi',
        ...SAO_PAULO
      }
    ]
  },
  {
    name: 'Bruno Lima',
    email: 'bruno.lima@myfood.dev',
    phone: '11983330002',
    addresses: [
      {
        label: 'Casa',
        zipCode: '05422010',
        street: 'Rua dos Pinheiros',
        number: '870',
        neighborhood: 'Pinheiros',
        ...SAO_PAULO
      }
    ]
  },
  {
    name: 'Camila Rocha',
    email: 'camila.rocha@myfood.dev',
    phone: '11983330003',
    addresses: [
      {
        label: 'Casa',
        zipCode: '04101300',
        street: 'Rua Domingos de Morais',
        number: '1200',
        complement: 'Casa 2',
        neighborhood: 'Vila Mariana',
        ...SAO_PAULO,
        reference: 'Portão verde'
      }
    ]
  },
  {
    name: 'Diego Martins',
    email: 'diego.martins@myfood.dev',
    phone: '19983330004',
    addresses: [
      {
        label: 'Casa',
        zipCode: '13025320',
        street: 'Rua Coronel Quirino',
        number: '1015',
        complement: 'Apto 31',
        neighborhood: 'Cambuí',
        ...CAMPINAS
      }
    ]
  },
  {
    name: 'Elisa Ferreira',
    email: 'elisa.ferreira@myfood.dev',
    phone: '11983330005',
    addresses: [
      {
        label: 'Casa',
        zipCode: '01426001',
        street: 'Rua Oscar Freire',
        number: '640',
        complement: 'Apto 12',
        neighborhood: 'Jardim Paulista',
        ...SAO_PAULO
      },
      {
        label: 'Casa dos pais',
        zipCode: '13083970',
        street: 'Avenida Albert Einstein',
        number: '400',
        neighborhood: 'Barão Geraldo',
        ...CAMPINAS
      }
    ]
  },
  {
    name: 'Gabriela Alves',
    email: 'gabriela.alves@myfood.dev',
    phone: '11983330006',
    addresses: [
      {
        label: 'Casa',
        zipCode: '01327000',
        street: 'Rua Treze de Maio',
        number: '455',
        neighborhood: 'Bela Vista',
        ...SAO_PAULO
      }
    ]
  },
  {
    name: 'Henrique Costa',
    email: 'henrique.costa@myfood.dev',
    phone: '11983330007',
    addresses: [
      {
        label: 'Casa',
        zipCode: '02012000',
        street: 'Rua Voluntários da Pátria',
        number: '2100',
        complement: 'Bloco B, apto 104',
        neighborhood: 'Santana',
        ...SAO_PAULO
      }
    ]
  },
  {
    name: 'Felipe Nunes',
    email: 'felipe.nunes@myfood.dev',
    phone: '11983330008',
    addresses: []
  }
]

export const RESTAURANTS: ISeedRestaurant[] = [
  {
    ownerEmail: 'marcos.brasa@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Brasa Burger',
    legalName: 'Brasa Burger Lanchonete Ltda',
    cnpj: '11223344000186',
    phone: '1130310001',
    email: 'contato@brasaburger.myfood.dev',
    description:
      'Smash burgers na chapa bem quente, pão brioche da casa e batata cortada na hora. Nascido em Pinheiros.',
    address: {
      zipCode: '05422001',
      street: 'Rua Teodoro Sampaio',
      number: '1220',
      neighborhood: 'Pinheiros',
      ...SAO_PAULO
    },
    deliveryFeeCents: 799,
    minOrderCents: 2500,
    avgPrepTimeMin: 25,
    cuisineSlugs: ['hamburguer', 'lanches'],
    shifts: [...shifts([0, 1, 2, 3, 4], '18:00', '23:30'), ...shifts([5, 6], '18:00', '01:00')],
    activate: true,
    acceptingOrders: true,
    drivers: [
      { name: 'João Batista', email: 'joao.moto@myfood.dev', phone: '11982220002' },
      { name: 'Sofia Ramos', email: 'sofia.entregas@myfood.dev', phone: '11982220003' }
    ],
    ratingBias: 4.6,
    ordersPerDay: [5, 12],
    menu: [
      {
        name: 'Smash Burgers',
        kind: 'main',
        products: [
          {
            name: 'Smash Clássico',
            description: 'Pão brioche, blend 90g prensado na chapa, queijo americano e picles.',
            priceCents: 2990
          },
          {
            name: 'Smash Duplo',
            description:
              'Dois blends de 90g, queijo americano duplo, cebola na chapa e molho da casa.',
            priceCents: 3690,
            top: true
          },
          {
            name: 'Smash Bacon',
            description: 'Dois blends de 90g, bacon crocante, cheddar e maionese defumada.',
            priceCents: 3890,
            top: true
          },
          {
            name: 'Smash Cheddar Cremoso',
            description: 'Dois blends de 90g cobertos com cheddar cremoso e cebola crispy.',
            priceCents: 3790
          },
          {
            name: 'Smash Triplo',
            description: 'Três blends de 90g, queijo triplo e picles. Para quem chegou com fome.',
            priceCents: 4490
          },
          {
            name: 'Smash Frango Crispy',
            description: 'Sobrecoxa empanada, alface e maionese de limão.',
            priceCents: 3490,
            archived: true
          }
        ]
      },
      {
        name: 'Burgers da Casa',
        kind: 'main',
        products: [
          {
            name: 'Brasa Especial',
            description: 'Blend de 180g, queijo prato, cebola caramelizada e maionese da casa.',
            priceCents: 4290,
            top: true
          },
          {
            name: 'Brasa Picante',
            description: 'Blend de 180g, pepper jack, jalapeño e maionese de chipotle.',
            priceCents: 4190
          },
          {
            name: 'Burger de Costela',
            description: 'Costela desfiada prensada, queijo coalho grelhado e barbecue de goiaba.',
            priceCents: 4590
          },
          {
            name: 'Veggie de Grão-de-Bico',
            description: 'Hambúrguer de grão-de-bico, rúcula, tomate assado e maionese vegana.',
            priceCents: 3590
          }
        ]
      },
      {
        name: 'Acompanhamentos',
        kind: 'side',
        products: [
          {
            name: 'Batata Frita Pequena',
            description: 'Batata rústica com páprica.',
            priceCents: 1490,
            top: true
          },
          {
            name: 'Batata Frita Grande',
            description: 'Batata rústica com páprica, porção para dividir.',
            priceCents: 2190
          },
          {
            name: 'Batata com Cheddar e Bacon',
            description: 'Batata rústica coberta com cheddar cremoso e bacon.',
            priceCents: 2890
          },
          {
            name: 'Onion Rings',
            description: 'Anéis de cebola empanados com molho barbecue.',
            priceCents: 2390
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          {
            name: 'Refrigerante Lata',
            description: 'Lata de 350ml. Cola, cola zero, guaraná ou laranja.',
            priceCents: 690,
            top: true
          },
          {
            name: 'Suco Natural',
            description: '500ml. Laranja, limão ou maracujá.',
            priceCents: 1290
          },
          { name: 'Água sem Gás', description: 'Garrafa de 500ml.', priceCents: 490 }
        ]
      },
      {
        name: 'Sobremesas',
        kind: 'side',
        products: [
          {
            name: 'Milkshake de Ovomaltine',
            description: '400ml de sorvete de creme batido com Ovomaltine crocante.',
            priceCents: 2290
          },
          {
            name: 'Brownie com Sorvete',
            description: 'Brownie de chocolate meio amargo com uma bola de sorvete de creme.',
            priceCents: 1990
          },
          {
            name: 'Cookie de Chocolate',
            description: 'Cookie assado na hora com gotas de chocolate belga.',
            priceCents: 990,
            unavailable: true
          }
        ]
      }
    ]
  },
  {
    ownerEmail: 'marcos.brasa@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Brasa Burger Moema',
    legalName: 'Brasa Burger Moema Lanchonete Ltda',
    cnpj: '77889900000166',
    phone: '1130310007',
    email: 'moema@brasaburger.myfood.dev',
    description: 'A segunda unidade da Brasa Burger. Em breve em Moema.',
    address: {
      zipCode: '04077000',
      street: 'Avenida Ibirapuera',
      number: '2500',
      neighborhood: 'Moema',
      ...SAO_PAULO
    },
    deliveryFeeCents: 699,
    minOrderCents: 2500,
    avgPrepTimeMin: 25,
    cuisineSlugs: ['hamburguer'],
    shifts: [],
    activate: false,
    acceptingOrders: false,
    drivers: [],
    ratingBias: 0,
    ordersPerDay: [0, 0],
    menu: []
  },
  {
    ownerEmail: 'juliana.rei@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Rei do Lanche',
    legalName: 'Rei do Lanche Fast Food Ltda',
    cnpj: '22334455000186',
    phone: '1130310002',
    email: 'sac@reidolanche.myfood.dev',
    description:
      'Combos rápidos, sanduíches clássicos e sorvete de casquinha. Aberto até as 2h da manhã.',
    address: {
      zipCode: '04014000',
      street: 'Rua Vergueiro',
      number: '2485',
      neighborhood: 'Vila Mariana',
      ...SAO_PAULO
    },
    deliveryFeeCents: 590,
    minOrderCents: 2000,
    avgPrepTimeMin: 15,
    cuisineSlugs: ['lanches', 'hamburguer'],
    shifts: shifts(ALL_DAYS, '10:00', '02:00'),
    activate: true,
    acceptingOrders: true,
    drivers: [
      { name: 'Lucas Oliveira', email: 'lucas.entregas@myfood.dev', phone: '11982220004' },
      {
        name: 'Thiago Barros',
        email: 'thiago.motoboy@myfood.dev',
        phone: '11982220005',
        deactivate: true
      }
    ],
    ratingBias: 4.1,
    ordersPerDay: [8, 18],
    menu: [
      {
        name: 'Combos',
        kind: 'main',
        products: [
          {
            name: 'Combo Rei Duplo',
            description: 'Rei Duplo, batata média e refrigerante de 500ml.',
            priceCents: 3990,
            top: true
          },
          {
            name: 'Combo Chicken Crispy',
            description: 'Chicken Crispy, batata média e refrigerante de 500ml.',
            priceCents: 3690,
            top: true
          },
          {
            name: 'Combo Cheese Salada',
            description: 'Cheese Salada, batata média e refrigerante de 500ml.',
            priceCents: 3490
          },
          {
            name: 'Combo Kids',
            description: 'Mini burger, batata pequena, suco de caixinha e um brinde.',
            priceCents: 2490
          },
          {
            name: 'Combo Rei Triplo',
            description: 'Rei Triplo, batata grande e refrigerante de 1L.',
            priceCents: 4890,
            archived: true
          }
        ]
      },
      {
        name: 'Sanduíches',
        kind: 'main',
        products: [
          {
            name: 'Rei Duplo',
            description: 'Dois hambúrgueres, queijo, alface, tomate e molho especial.',
            priceCents: 2490,
            top: true
          },
          {
            name: 'Cheese Salada',
            description: 'Hambúrguer, queijo, alface, tomate e maionese.',
            priceCents: 1990
          },
          {
            name: 'Cheese Bacon',
            description: 'Hambúrguer, queijo, bacon e maionese.',
            priceCents: 2290
          },
          {
            name: 'Chicken Crispy',
            description: 'Frango empanado, alface e maionese temperada.',
            priceCents: 2190
          },
          {
            name: 'X-Tudo',
            description: 'Hambúrguer, ovo, presunto, queijo, bacon, alface, tomate e milho.',
            priceCents: 2890
          },
          {
            name: 'Wrap de Frango',
            description: 'Tortilha com frango grelhado, alface, tomate e molho ranch.',
            priceCents: 2190
          }
        ]
      },
      {
        name: 'Porções',
        kind: 'side',
        products: [
          {
            name: 'Batata Média',
            description: 'Batata frita palito.',
            priceCents: 1190,
            top: true
          },
          { name: 'Batata Grande', description: 'Batata frita palito.', priceCents: 1490 },
          {
            name: 'Nuggets (10 un.)',
            description: 'Nuggets de frango com dois molhos à escolha.',
            priceCents: 1890
          },
          {
            name: 'Mandioca Frita',
            description: 'Mandioca frita crocante com maionese de alho.',
            priceCents: 1690
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          {
            name: 'Refrigerante 500ml',
            description: 'Cola, cola zero, guaraná ou laranja.',
            priceCents: 890,
            top: true
          },
          {
            name: 'Refrigerante 1L',
            description: 'Cola, cola zero ou guaraná.',
            priceCents: 1290
          },
          { name: 'Chá Gelado', description: 'Pêssego ou limão, 450ml.', priceCents: 1090 },
          { name: 'Água com Gás', description: 'Garrafa de 500ml.', priceCents: 590 }
        ]
      },
      {
        name: 'Sobremesas',
        kind: 'side',
        products: [
          { name: 'Casquinha de Baunilha', description: 'Sorvete de baunilha.', priceCents: 490 },
          {
            name: 'Sundae de Chocolate',
            description: 'Sorvete de baunilha com calda quente de chocolate.',
            priceCents: 1190
          },
          {
            name: 'Torta de Maçã',
            description: 'Massa crocante recheada com maçã e canela.',
            priceCents: 890,
            unavailable: true
          }
        ]
      }
    ]
  },
  {
    ownerEmail: 'rosa.nonna@myfood.dev',
    coOwnerEmails: ['rafael.pizza@myfood.dev'],
    tradeName: 'Nonna Rosa Pizzaria',
    legalName: 'Nonna Rosa Pizzaria e Cantina Ltda',
    cnpj: '33445566000186',
    phone: '1130310003',
    email: 'pedidos@nonnarosa.myfood.dev',
    description:
      'Pizza de fermentação natural assada no forno a lenha, receitas da família desde 1987 no Bixiga.',
    address: {
      zipCode: '01323001',
      street: 'Rua Treze de Maio',
      number: '890',
      neighborhood: 'Bela Vista',
      ...SAO_PAULO
    },
    deliveryFeeCents: 990,
    minOrderCents: 4000,
    avgPrepTimeMin: 40,
    cuisineSlugs: ['pizza', 'italiana'],
    shifts: shifts([0, 2, 3, 4, 5, 6], '18:00', '23:30'),
    activate: true,
    acceptingOrders: true,
    drivers: [CARLOS],
    ratingBias: 4.8,
    ordersPerDay: [4, 10],
    menu: [
      {
        name: 'Pizzas Tradicionais',
        kind: 'main',
        products: [
          {
            name: 'Margherita',
            description: 'Molho de tomate italiano, mussarela de búfala, manjericão e azeite.',
            priceCents: 6990,
            top: true
          },
          {
            name: 'Calabresa',
            description: 'Mussarela, calabresa artesanal, cebola roxa e azeitonas pretas.',
            priceCents: 6490,
            top: true
          },
          {
            name: 'Mussarela',
            description: 'Molho de tomate, mussarela e orégano.',
            priceCents: 5990
          },
          {
            name: 'Portuguesa',
            description: 'Mussarela, presunto, ovos, cebola, ervilha e azeitonas.',
            priceCents: 7290
          },
          {
            name: 'Frango com Catupiry',
            description: 'Frango desfiado temperado e Catupiry original.',
            priceCents: 7290
          },
          {
            name: 'Quatro Queijos',
            description: 'Mussarela, gorgonzola, parmesão e provolone.',
            priceCents: 7490
          },
          {
            name: 'Atum',
            description: 'Atum sólido, cebola e mussarela.',
            priceCents: 6890,
            archived: true
          }
        ]
      },
      {
        name: 'Pizzas Especiais',
        kind: 'main',
        products: [
          {
            name: 'Burrata e Presunto Cru',
            description: 'Burrata inteira, presunto cru, rúcula e redução de balsâmico.',
            priceCents: 9490,
            unavailable: true
          },
          {
            name: 'Pistache com Mortadela',
            description: 'Mortadela italiana, pistache tostado, stracciatella e raspas de limão.',
            priceCents: 8990,
            top: true
          },
          {
            name: 'Abobrinha com Gorgonzola',
            description: 'Abobrinha grelhada, gorgonzola, nozes e mel.',
            priceCents: 7990
          },
          {
            name: 'Carbonara',
            description: 'Creme de gema, guanciale, pecorino e pimenta-do-reino.',
            priceCents: 8490
          }
        ]
      },
      {
        name: 'Pizzas Doces',
        kind: 'main',
        products: [
          {
            name: 'Chocolate com Morango',
            description: 'Chocolate ao leite e morangos frescos.',
            priceCents: 6490
          },
          {
            name: 'Banana com Canela',
            description: 'Banana, açúcar mascavo, canela e leite condensado.',
            priceCents: 5490
          },
          {
            name: 'Romeu e Julieta',
            description: 'Goiabada cascão e queijo minas derretido.',
            priceCents: 5990
          }
        ]
      },
      {
        name: 'Massas',
        kind: 'main',
        products: [
          {
            name: 'Lasanha à Bolonhesa',
            description: 'Massa fresca, ragu de carne cozido por 6 horas e bechamel.',
            priceCents: 5890
          },
          {
            name: 'Nhoque ao Sugo',
            description: 'Nhoque de batata com molho de tomate e parmesão.',
            priceCents: 4890
          },
          {
            name: 'Fettuccine Alfredo',
            description: 'Fettuccine na manteiga com creme de parmesão.',
            priceCents: 5490
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          {
            name: 'Refrigerante 2L',
            description: 'Cola, cola zero ou guaraná.',
            priceCents: 1490,
            top: true
          },
          {
            name: 'Suco de Uva Integral',
            description: 'Garrafa de 1L.',
            priceCents: 1990
          },
          {
            name: 'Vinho Tinto Chianti',
            description: 'Garrafa de 750ml. Venda proibida para menores de 18 anos.',
            priceCents: 12900
          },
          { name: 'Água Tônica', description: 'Lata de 350ml.', priceCents: 690 }
        ]
      }
    ]
  },
  {
    ownerEmail: 'rafael.pizza@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Pizza Rápida',
    legalName: 'Pizza Rápida Delivery Ltda',
    cnpj: '44556677000186',
    phone: '1130310004',
    email: 'contato@pizzarapida.myfood.dev',
    description: 'Pizza média em 30 minutos, frete grátis em São Paulo e borda recheada.',
    address: {
      zipCode: '02011000',
      street: 'Rua Voluntários da Pátria',
      number: '1650',
      neighborhood: 'Santana',
      ...SAO_PAULO
    },
    deliveryFeeCents: 0,
    minOrderCents: 3500,
    avgPrepTimeMin: 30,
    cuisineSlugs: ['pizza'],
    shifts: [...shifts(ALL_DAYS, '11:00', '15:00'), ...shifts(ALL_DAYS, '18:00', '00:30')],
    activate: true,
    acceptingOrders: false,
    drivers: [
      CARLOS,
      { name: 'Vinícius Araújo', email: 'vinicius.moto@myfood.dev', phone: '11982220006' }
    ],
    ratingBias: 3.7,
    ordersPerDay: [6, 14],
    menu: [
      {
        name: 'Pizzas Clássicas',
        kind: 'main',
        products: [
          {
            name: 'Pepperoni',
            description: 'Pizza média com mussarela e pepperoni.',
            priceCents: 4990,
            top: true
          },
          {
            name: 'Mussarela',
            description: 'Pizza média com molho de tomate e mussarela.',
            priceCents: 4290,
            top: true
          },
          {
            name: 'Calabresa com Cebola',
            description: 'Pizza média com calabresa fatiada e cebola.',
            priceCents: 4590
          },
          {
            name: 'Frango com Requeijão',
            description: 'Pizza média com frango desfiado e requeijão cremoso.',
            priceCents: 4790
          },
          {
            name: 'Marguerita',
            description: 'Pizza média com mussarela, tomate e manjericão.',
            priceCents: 4490
          },
          {
            name: 'Bacon com Milho',
            description: 'Pizza média com bacon, milho e mussarela.',
            priceCents: 4790
          },
          {
            name: 'Havaiana',
            description: 'Pizza média com presunto, abacaxi e mussarela.',
            priceCents: 4690,
            archived: true
          }
        ]
      },
      {
        name: 'Pizzas Premium',
        kind: 'main',
        products: [
          {
            name: 'Pepperoni Duplo com Borda Recheada',
            description: 'Pizza média com o dobro de pepperoni e borda de cheddar.',
            priceCents: 6490
          },
          {
            name: 'Supreme',
            description: 'Pepperoni, carne temperada, pimentão, cebola, champignon e azeitona.',
            priceCents: 6290
          },
          {
            name: 'Costela com Barbecue',
            description: 'Costela desfiada, cebola caramelizada e molho barbecue.',
            priceCents: 6690
          }
        ]
      },
      {
        name: 'Acompanhamentos',
        kind: 'side',
        products: [
          {
            name: 'Pão de Alho (4 un.)',
            description: 'Pão de alho com mussarela gratinada.',
            priceCents: 1490
          },
          {
            name: 'Asinhas Barbecue (8 un.)',
            description: 'Asinhas de frango assadas com molho barbecue.',
            priceCents: 3290
          },
          {
            name: 'Palitos de Queijo',
            description: 'Massa de pizza recheada com queijo e molho de tomate para mergulhar.',
            priceCents: 1890
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          {
            name: 'Refrigerante 2L',
            description: 'Cola, cola zero ou guaraná.',
            priceCents: 1390,
            top: true
          },
          { name: 'Refrigerante Lata', description: 'Lata de 350ml.', priceCents: 650 },
          { name: 'Guaraná 1L', description: 'Garrafa de 1L.', priceCents: 990 }
        ]
      },
      {
        name: 'Sobremesas',
        kind: 'side',
        products: [
          {
            name: 'Brownie',
            description: 'Brownie de chocolate com nozes.',
            priceCents: 1290
          },
          {
            name: 'Brotinho de Brigadeiro',
            description: 'Pizza broto de brigadeiro com granulado.',
            priceCents: 2990
          }
        ]
      }
    ]
  },
  {
    ownerEmail: 'gustavo.fogo@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Fogo Gaúcho Churrascaria',
    legalName: 'Fogo Gaúcho Churrascaria Ltda',
    cnpj: '55667788000186',
    phone: '1130310005',
    email: 'reservas@fogogaucho.myfood.dev',
    description:
      'Cortes nobres assados na brasa de lenha, acompanhamentos da serra gaúcha e pratos executivos no almoço.',
    address: {
      zipCode: '04530001',
      street: 'Rua Joaquim Floriano',
      number: '466',
      neighborhood: 'Itaim Bibi',
      ...SAO_PAULO
    },
    deliveryFeeCents: 1290,
    minOrderCents: 6000,
    avgPrepTimeMin: 45,
    cuisineSlugs: ['churrasco', 'brasileira'],
    shifts: [
      ...shifts([0, 2, 3, 4, 5, 6], '11:30', '15:30'),
      ...shifts([2, 3, 4, 5, 6], '18:30', '23:00')
    ],
    activate: true,
    acceptingOrders: true,
    drivers: [{ name: 'Bianca Lopes', email: 'bianca.entregas@myfood.dev', phone: '11982220007' }],
    ratingBias: 4.5,
    ordersPerDay: [3, 8],
    menu: [
      {
        name: 'Cortes na Brasa',
        kind: 'main',
        products: [
          {
            name: 'Picanha na Brasa (400g)',
            description: 'Picanha maturada, sal grosso e farofa de alho. Serve 2 pessoas.',
            priceCents: 11990,
            top: true
          },
          {
            name: 'Fraldinha (400g)',
            description: 'Fraldinha na brasa com chimichurri. Serve 2 pessoas.',
            priceCents: 8990
          },
          {
            name: 'Costela Fogo de Chão (600g)',
            description: 'Costela assada por 12 horas no fogo de chão.',
            priceCents: 9490,
            top: true
          },
          {
            name: 'Maminha (400g)',
            description: 'Maminha na brasa com manteiga de ervas.',
            priceCents: 8490
          },
          {
            name: 'Cupim (500g)',
            description: 'Cupim assado lentamente e desfiado na hora.',
            priceCents: 7990,
            unavailable: true
          },
          {
            name: 'Linguiça Toscana (4 un.)',
            description: 'Linguiça artesanal na brasa com vinagrete.',
            priceCents: 3490
          },
          {
            name: 'Espeto Misto',
            description: 'Picanha, frango e linguiça no espeto.',
            priceCents: 6990,
            archived: true
          }
        ]
      },
      {
        name: 'Pratos Executivos',
        kind: 'main',
        products: [
          {
            name: 'Executivo de Picanha',
            description: 'Picanha (200g), arroz, feijão tropeiro, farofa e vinagrete.',
            priceCents: 6490,
            top: true
          },
          {
            name: 'Executivo de Fraldinha',
            description: 'Fraldinha (200g), arroz, feijão tropeiro, farofa e vinagrete.',
            priceCents: 5490
          },
          {
            name: 'Executivo de Frango',
            description: 'Sobrecoxa na brasa, arroz, feijão tropeiro, farofa e vinagrete.',
            priceCents: 3990
          }
        ]
      },
      {
        name: 'Acompanhamentos',
        kind: 'side',
        products: [
          { name: 'Arroz Branco', description: 'Porção para 2 pessoas.', priceCents: 1290 },
          {
            name: 'Feijão Tropeiro',
            description: 'Feijão, farinha de mandioca, bacon, ovo e couve.',
            priceCents: 1890,
            top: true
          },
          {
            name: 'Farofa da Casa',
            description: 'Farofa de manteiga com bacon e cebola.',
            priceCents: 1190
          },
          { name: 'Vinagrete', description: 'Tomate, cebola e pimentão.', priceCents: 990 },
          {
            name: 'Mandioca na Manteiga',
            description: 'Mandioca cozida e dourada na manteiga de garrafa.',
            priceCents: 1690
          },
          {
            name: 'Pão de Queijo (6 un.)',
            description: 'Pão de queijo mineiro assado na hora.',
            priceCents: 1490
          }
        ]
      },
      {
        name: 'Sobremesas',
        kind: 'side',
        products: [
          { name: 'Pudim de Leite', description: 'Pudim de leite condensado.', priceCents: 1690 },
          {
            name: 'Petit Gâteau',
            description: 'Bolinho de chocolate com sorvete de creme.',
            priceCents: 2490
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          { name: 'Refrigerante Lata', description: 'Lata de 350ml.', priceCents: 790 },
          {
            name: 'Suco de Laranja',
            description: '500ml, espremido na hora.',
            priceCents: 1390
          },
          {
            name: 'Caipirinha de Limão',
            description: 'Cachaça artesanal. Venda proibida para menores de 18 anos.',
            priceCents: 2490
          }
        ]
      }
    ]
  },
  {
    ownerEmail: 'helena.tempero@myfood.dev',
    coOwnerEmails: [],
    tradeName: 'Tempero Mineiro',
    legalName: 'Tempero Mineiro Restaurante Ltda',
    cnpj: '66778899000186',
    phone: '1932310006',
    email: 'ola@temperomineiro.myfood.dev',
    description:
      'Comida caseira mineira no fogão a lenha: feijoada aos sábados, marmitas e pão de queijo quentinho.',
    address: {
      zipCode: '13024001',
      street: 'Rua Maria Monteiro',
      number: '720',
      neighborhood: 'Cambuí',
      ...CAMPINAS
    },
    deliveryFeeCents: 690,
    minOrderCents: 2500,
    avgPrepTimeMin: 30,
    cuisineSlugs: ['brasileira', 'marmita'],
    shifts: [...shifts([1, 2, 3, 4, 5, 6], '11:00', '15:00'), ...shifts([0], '11:00', '16:00')],
    activate: true,
    acceptingOrders: true,
    drivers: [{ name: 'Renan Silva', email: 'renan.entregas@myfood.dev', phone: '19982220008' }],
    ratingBias: 4.4,
    ordersPerDay: [4, 10],
    menu: [
      {
        name: 'Pratos do Dia',
        kind: 'main',
        products: [
          {
            name: 'Feijoada Completa',
            description: 'Feijoada com carnes nobres, arroz, couve, farofa, torresmo e laranja.',
            priceCents: 4490,
            top: true
          },
          {
            name: 'Frango com Quiabo e Angu',
            description: 'Frango caipira ensopado com quiabo e angu de fubá.',
            priceCents: 3690
          },
          {
            name: 'Tutu à Mineira',
            description: 'Tutu de feijão, lombo, linguiça, couve, ovo e torresmo.',
            priceCents: 3890
          },
          {
            name: 'Vaca Atolada',
            description: 'Costela bovina cozida com mandioca.',
            priceCents: 4290
          },
          {
            name: 'Leitão à Pururuca',
            description: 'Leitão assado com pele pururucada, arroz e feijão.',
            priceCents: 5490,
            archived: true
          }
        ]
      },
      {
        name: 'Marmitas',
        kind: 'main',
        products: [
          {
            name: 'Marmita Carne de Panela',
            description: 'Carne de panela, arroz, feijão, batata e salada.',
            priceCents: 3190,
            top: true
          },
          {
            name: 'Marmita Frango Grelhado',
            description: 'Filé de frango grelhado, arroz integral, legumes e salada.',
            priceCents: 2890
          },
          {
            name: 'Marmita Strogonoff de Frango',
            description: 'Strogonoff de frango, arroz branco e batata palha.',
            priceCents: 2990
          },
          {
            name: 'Marmita Parmegiana',
            description: 'Bife à parmegiana, arroz, feijão e fritas.',
            priceCents: 3490
          }
        ]
      },
      {
        name: 'Porções',
        kind: 'side',
        products: [
          {
            name: 'Pão de Queijo (10 un.)',
            description: 'Pão de queijo com queijo canastra.',
            priceCents: 1990,
            top: true
          },
          {
            name: 'Torresmo Pururuca',
            description: 'Torresmo de barriga crocante.',
            priceCents: 2490
          },
          {
            name: 'Mandioca Frita',
            description: 'Mandioca frita sequinha.',
            priceCents: 1890
          }
        ]
      },
      {
        name: 'Sobremesas',
        kind: 'side',
        products: [
          {
            name: 'Doce de Leite com Queijo',
            description: 'Doce de leite de corte com queijo minas frescal.',
            priceCents: 1290
          },
          {
            name: 'Goiabada com Queijo',
            description: 'Goiabada cascão com queijo minas.',
            priceCents: 1190
          },
          {
            name: 'Pudim de Leite',
            description: 'Pudim cremoso com calda de caramelo.',
            priceCents: 1390,
            unavailable: true
          }
        ]
      },
      {
        name: 'Bebidas',
        kind: 'side',
        products: [
          {
            name: 'Suco de Maracujá',
            description: '500ml, da fruta.',
            priceCents: 1090,
            top: true
          },
          { name: 'Refrigerante Lata', description: 'Lata de 350ml.', priceCents: 650 },
          { name: 'Café Coado', description: 'Café coado na hora, 200ml.', priceCents: 500 }
        ]
      }
    ]
  }
]
