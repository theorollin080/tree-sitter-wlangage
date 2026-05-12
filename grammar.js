/**
 * Tree-sitter grammar for WLangage (PCSOFT)
 * French + English keywords, case-insensitive
 */

// Case-insensitive regex for a single word (no spaces)
function ci(word) {
  return new RegExp(
    word.split('').map(c => {
      const l = c.toLowerCase();
      const u = c.toUpperCase();
      if (l === u) {
        // Non-alphabetic: escape regex meta-chars
        return c.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
      }
      return '[' + l + u + ']';
    }).join('')
  );
}

// Single-word case-insensitive token
function kw(word) {
  return token(ci(word));
}

module.exports = grammar({
  name: 'wlangage',

  word: $ => $.identifier,

  extras: $ => [
    /[ \t\r]/,
    $.comment,
    $.block_comment,
  ],

  conflicts: $ => [
    [$._statement, $.expression_statement],
    [$.function_call, $.identifier],
    [$._type_specifier, $.identifier],
    [$.assignment, $.binary_expression],
    [$.variable_declaration, $.expression_statement],
    // TANTQUE appears as both the start of while_statement and the
    // end condition of do_while_statement — GLR resolves by context
    [$.while_statement, $.do_while_statement],
  ],

  rules: {

    // ─── Top level ────────────────────────────────────────────────────────────
    source_file: $ => repeat(choice(
      seq($._statement, $._eol),
      $._eol,
    )),

    _eol: $ => /\n+/,

    // ─── Statements ───────────────────────────────────────────────────────────
    _statement: $ => choice(
      $.variable_declaration,
      $.assignment,
      $.augmented_assignment,
      $.if_statement,
      $.for_statement,
      $.for_each_statement,
      $.while_statement,
      $.do_while_statement,
      $.switch_statement,
      $.procedure_declaration,
      $.function_declaration,
      $.class_declaration,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.try_statement,
      $.throw_statement,
      $.expression_statement,
    ),

    // ─── Comments ─────────────────────────────────────────────────────────────
    comment: $ => token(seq('//', /[^\n]*/)),
    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),

    // ─── Variable declaration ─────────────────────────────────────────────────
    // LOCAL sVar EST UNE CHAÎNE = "..."
    // LOCAL nAge IS INT = 0
    variable_declaration: $ => seq(
      optional($.scope_modifier),
      field('name', $.identifier),
      $._type_annotation,
      optional(seq('=', $._expression)),
    ),

    // "EST UN" / "EST UNE" / "IS A" / "IS" — each word is a separate token
    _type_annotation: $ => choice(
      seq(kw('EST'), kw('UN'),  $._type_specifier),
      seq(kw('EST'), kw('UNE'), $._type_specifier),
      seq(kw('IS'),  kw('A'),   $._type_specifier),
      seq(kw('IS'),             $._type_specifier),
    ),

    scope_modifier: $ => choice(kw('LOCAL'), kw('GLOBAL')),

    // ─── Types ────────────────────────────────────────────────────────────────
    _type_specifier: $ => choice(
      $.primitive_type,
      $.array_type,
      $.class_type,
    ),

    primitive_type: $ => choice(
      // Integer FR
      kw('ENTIER'), kw('ENTIER1'), kw('ENTIER2'), kw('ENTIER4'), kw('ENTIER8'),
      // Integer EN
      kw('INT'), kw('INTEGER'), kw('INT1'), kw('INT2'), kw('INT4'), kw('INT8'),
      // Real FR (É and E variants)
      kw('RÉEL'), kw('REEL'), kw('RÉEL4'), kw('REEL4'), kw('RÉEL8'), kw('REEL8'),
      // Real EN
      kw('REAL'), kw('REAL4'), kw('REAL8'), kw('DOUBLE'), kw('FLOAT'),
      // String FR (Î and I variants)
      kw('CHAÎNE'), kw('CHAINE'),
      // String EN
      kw('STRING'),
      // Boolean FR
      kw('BOOLÉEN'), kw('BOOLEEN'),
      // Boolean EN
      kw('BOOLEAN'),
      // Date/Time FR
      kw('DATE'), kw('HEURE'), kw('DATEHEURE'), kw('DURÉE'), kw('DUREE'),
      // Date/Time EN
      kw('TIME'), kw('DATETIME'), kw('DURATION'),
      // Currency
      kw('MONÉTAIRE'), kw('MONETAIRE'), kw('CURRENCY'),
      // Byte types
      kw('OCTET'), kw('BYTE'), kw('WORD'), kw('DWORD'),
      // Other
      kw('IMAGE'), kw('VARIANT'),
      kw('OBJET'), kw('OBJECT'),
      kw('BUFFER'), kw('XML'), kw('JSON'), kw('UUID'),
      kw('DONNÉES'), kw('DONNEES'), kw('DATA'),
      kw('NUMÉRIQUE'), kw('NUMERIQUE'), kw('NUMERIC'),
    ),

    // TABLEAU[10] DE CHAÎNE  /  ARRAY[10] OF STRING
    array_type: $ => seq(
      choice(kw('TABLEAU'), kw('ARRAY')),
      optional($.array_dimension),
      optional(seq(
        choice(kw('DE'), kw('OF')),
        $._type_specifier,
      )),
    ),

    // Class instances: sVar EST UN MaClasse
    class_type: $ => $.identifier,

    // Array size declaration: [10] or [5, 5]
    array_dimension: $ => seq('[', commaSep($.integer_literal), ']'),

    // ─── Assignment ───────────────────────────────────────────────────────────
    assignment: $ => seq(
      field('left', $._lvalue),
      '=',
      field('right', $._expression),
    ),

    augmented_assignment: $ => seq(
      field('left', $._lvalue),
      choice('+=', '-=', '*=', '/=', '%=', '&=', '|='),
      field('right', $._expression),
    ),

    _lvalue: $ => choice(
      $.identifier,
      $.member_access,
      $.subscript_expression,
    ),

    // ─── If statement ─────────────────────────────────────────────────────────
    if_statement: $ => seq(
      choice(kw('SI'), kw('IF')),
      field('condition', $._expression),
      optional(choice(kw('ALORS'), kw('THEN'))),
      $._eol,
      repeat(seq($._statement, $._eol)),
      repeat($.elseif_clause),
      optional($.else_clause),
      choice(kw('FIN'), kw('END')),
    ),

    elseif_clause: $ => seq(
      choice(
        seq(kw('SINON'), kw('SI')),
        seq(kw('ELSE'),  kw('IF')),
      ),
      field('condition', $._expression),
      optional(choice(kw('ALORS'), kw('THEN'))),
      $._eol,
      repeat(seq($._statement, $._eol)),
    ),

    else_clause: $ => seq(
      choice(kw('SINON'), kw('ELSE')),
      $._eol,
      repeat(seq($._statement, $._eol)),
    ),

    // ─── For loop ─────────────────────────────────────────────────────────────
    for_statement: $ => seq(
      choice(kw('POUR'), kw('FOR')),
      field('counter', $.identifier),
      '=',
      field('from', $._expression),
      choice(kw('À'), kw('A'), kw('TO')),
      field('to', $._expression),
      optional(seq(
        choice(kw('PAS'), kw('STEP')),
        field('step', $._expression),
      )),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    // POUR TOUT élément DE tableau
    for_each_statement: $ => seq(
      choice(
        seq(kw('POUR'), kw('TOUT')),
        seq(kw('FOR'),  kw('EACH')),
      ),
      field('variable', $.identifier),
      optional(seq(
        choice(kw('DE'), kw('FROM'), kw('IN')),
        field('iterable', $._expression),
      )),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    // ─── While loop ───────────────────────────────────────────────────────────
    while_statement: $ => seq(
      choice(kw('TANTQUE'), kw('WHILE')),
      field('condition', $._expression),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    do_while_statement: $ => seq(
      choice(kw('FAIRE'), kw('DO')),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('TANTQUE'), kw('WHILE'), kw('UNTIL')),
      field('condition', $._expression),
    ),

    // ─── Switch / Selon ────────────────────────────────────────────────────────
    switch_statement: $ => seq(
      choice(kw('SELON'), kw('SWITCH')),
      field('value', $._expression),
      $._eol,
      repeat($.case_clause),
      optional($.other_case_clause),
      choice(kw('FIN'), kw('END')),
    ),

    case_clause: $ => seq(
      choice(kw('CAS'), kw('CASE')),
      commaSep1(field('value', $._expression)),
      ':',
      $._eol,
      repeat(seq($._statement, $._eol)),
    ),

    other_case_clause: $ => seq(
      choice(
        seq(kw('AUTRE'), kw('CAS')),
        seq(kw('OTHER'), kw('CASE')),
        kw('DEFAULT'),
      ),
      ':',
      $._eol,
      repeat(seq($._statement, $._eol)),
    ),

    // ─── Procedure / Function ─────────────────────────────────────────────────
    procedure_declaration: $ => seq(
      optional($.scope_modifier),
      choice(kw('PROCÉDURE'), kw('PROCEDURE')),
      field('name', $.identifier),
      '(',
      optional($.parameter_list),
      ')',
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    function_declaration: $ => seq(
      optional($.scope_modifier),
      choice(kw('FONCTION'), kw('FUNCTION')),
      field('name', $.identifier),
      '(',
      optional($.parameter_list),
      ')',
      optional(seq(':', field('return_type', $._type_specifier))),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    parameter_list: $ => commaSep1($.parameter),

    parameter: $ => seq(
      optional($.param_direction),
      field('name', $.identifier),
      optional(seq(
        choice(
          seq(kw('EST'), kw('UN')),
          seq(kw('EST'), kw('UNE')),
          seq(kw('IS'),  kw('A')),
          kw('IS'),
        ),
        field('type', $._type_specifier),
      )),
      optional(seq('=', field('default', $._expression))),
    ),

    // EN ENTRÉE / EN SORTIE / IN / OUT
    param_direction: $ => choice(
      seq(kw('EN'), kw('ENTRÉE')),
      seq(kw('EN'), kw('SORTIE')),
      kw('IN'), kw('OUT'), kw('INOUT'),
    ),

    // ─── Class ────────────────────────────────────────────────────────────────
    class_declaration: $ => seq(
      choice(kw('CLASSE'), kw('CLASS')),
      field('name', $.identifier),
      optional(seq(
        choice(kw('HÉRITE'), kw('INHERITS'), kw('EXTENDS')),
        field('parent', $.identifier),
      )),
      $._eol,
      repeat(seq($.class_member, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    class_member: $ => choice(
      $.access_modifier,
      $.variable_declaration,
      $.constructor_declaration,
      $.destructor_declaration,
      $.procedure_declaration,
      $.function_declaration,
    ),

    access_modifier: $ => seq(
      choice(
        kw('PUBLIC'),
        kw('PRIVÉ'), kw('PRIVE'), kw('PRIVATE'),
        kw('PROTÉGÉ'), kw('PROTEGE'), kw('PROTECTED'),
      ),
      ':',
    ),

    constructor_declaration: $ => seq(
      choice(kw('CONSTRUCTEUR'), kw('CONSTRUCTOR')),
      '(',
      optional($.parameter_list),
      ')',
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    destructor_declaration: $ => seq(
      choice(kw('DESTRUCTEUR'), kw('DESTRUCTOR')),
      '(', ')',
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(kw('FIN'), kw('END')),
    ),

    // ─── Return / Break / Continue ────────────────────────────────────────────
    return_statement: $ => seq(
      choice(kw('RETOUR'), kw('RENVOIE'), kw('RETURN')),
      optional(field('value', $._expression)),
    ),

    // SORTIE DE BOUCLE = three separate tokens
    break_statement: $ => choice(
      seq(kw('SORTIE'), kw('DE'), kw('BOUCLE')),
      kw('BREAK'),
    ),

    continue_statement: $ => choice(
      kw('CONTINUE'),
      seq(kw('ITÉRATION'), kw('SUIVANTE')),
    ),

    // ─── Try / Essaie ─────────────────────────────────────────────────────────
    // EN CAS D'ERREUR = three tokens: EN, CAS, D'ERREUR
    // (D'ERREUR is one contracted French word with apostrophe)
    try_statement: $ => seq(
      choice(kw('ESSAIE'), kw('TRY')),
      $._eol,
      repeat(seq($._statement, $._eol)),
      choice(
        seq(kw('EN'), kw('CAS'), $.derreur_keyword),
        kw('CATCH'),
      ),
      optional(seq('(', $.identifier, ')')),
      $._eol,
      repeat(seq($._statement, $._eol)),
      optional(seq(
        kw('FINALLY'),
        $._eol,
        repeat(seq($._statement, $._eol)),
      )),
      choice(
        seq(kw('FIN'), kw('ESSAIE')),
        seq(kw('END'), kw('TRY')),
        kw('FIN'),
        kw('END'),
      ),
    ),

    // D'ERREUR — contracted French token (apostrophe inside the word)
    derreur_keyword: $ => /[dD]'[eE][rR][rR][eE][uU][rR]/,

    throw_statement: $ => seq(
      choice(kw('LEVE'), kw('THROW')),
      field('value', $._expression),
    ),

    // ─── Expressions ──────────────────────────────────────────────────────────
    expression_statement: $ => $._expression,

    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.ternary_expression,
      $.function_call,
      $.member_access,
      $.subscript_expression,
      $.new_expression,
      $.string_literal,
      $.integer_literal,
      $.real_literal,
      $.boolean_literal,
      $.null_literal,
      $.date_literal,
      $.duration_literal,
      $.identifier,
      $.parenthesized_expression,
    ),

    binary_expression: $ => choice(
      prec.left(1, seq($._expression, choice(kw('OU'), kw('OR'),  '||'), $._expression)),
      prec.left(2, seq($._expression, choice(kw('ET'), kw('AND'), '&&'), $._expression)),
      prec.left(3, seq($._expression, choice('<>', '!=', '<', '>', '<=', '>='), $._expression)),
      prec.left(4, seq($._expression, choice(kw('DANS'), kw('IN')), $._expression)),
      prec.left(5, seq($._expression, choice('+', '-', '&'), $._expression)),
      prec.left(6, seq($._expression, choice('*', '/', kw('MODULO'), kw('MOD'), '%'), $._expression)),
      prec.left(7, seq($._expression, '^', $._expression)),
    ),

    unary_expression: $ => choice(
      prec(8, seq(choice(kw('NON'), kw('NOT'), '!'), $._expression)),
      prec(8, seq(token(seq('-')), $._expression)),
      prec(8, seq(token(seq('+')), $._expression)),
    ),

    ternary_expression: $ => prec.right(0, seq(
      $._expression, '?', $._expression, ':', $._expression,
    )),

    function_call: $ => prec(9, seq(
      field('function', choice($.identifier, $.member_access)),
      '(',
      optional($.argument_list),
      ')',
    )),

    argument_list: $ => commaSep1($._expression),

    member_access: $ => prec.left(10, seq(
      $._expression,
      '.',
      field('property', $.identifier),
    )),

    subscript_expression: $ => prec.left(10, seq(
      $._expression, '[', $._expression, ']',
    )),

    new_expression: $ => seq(
      choice(kw('NOUVEAU'), kw('NEW')),
      field('class', $.identifier),
      '(',
      optional($.argument_list),
      ')',
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // ─── Literals ─────────────────────────────────────────────────────────────
    string_literal: $ => choice(
      seq('"', repeat(choice(/[^"\\]+/, $.escape_sequence)), '"'),
      seq("'", repeat(choice(/[^'\\]+/, $.escape_sequence)), "'"),
    ),

    escape_sequence: $ => token(seq(
      '\\',
      choice(
        /[nrt\\"'0]/,
        /u[0-9a-fA-F]{4}/,
        /x[0-9a-fA-F]{2}/,
      ),
    )),

    integer_literal: $ => token(choice(
      /[0-9]+/,
      /0[xX][0-9a-fA-F]+/,
      /0[bB][01]+/,
      /0[oO][0-7]+/,
    )),

    real_literal: $ => token(/[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?/),

    boolean_literal: $ => choice(
      kw('VRAI'), kw('FAUX'),
      kw('TRUE'), kw('FALSE'),
    ),

    null_literal: $ => choice(kw('NUL'), kw('NULL')),

    // "20/01/2024"
    date_literal: $ => token(/"\d{2}\/\d{2}\/\d{4}"/),

    // "0:30:00"
    duration_literal: $ => token(/"\d+:\d{2}:\d{2}"/),

    // ─── Identifier ───────────────────────────────────────────────────────────
    // Supports Unicode letters (French accented chars + standard ASCII)
    identifier: $ => /[a-zA-ZÀ-ÖØ-öø-ÿ_][a-zA-ZÀ-ÖØ-öø-ÿ0-9_]*/,
  },
});

function commaSep(rule)  { return optional(commaSep1(rule)); }
function commaSep1(rule) { return seq(rule, repeat(seq(',', rule))); }
