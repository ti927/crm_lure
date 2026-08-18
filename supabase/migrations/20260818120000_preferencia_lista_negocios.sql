-- ============================================================
-- CRM Lure — persistência de filtro e ordenação da Lista (B-045).
--
-- Guarda a última combinação de filtro/ordenação de cada usuário na
-- Lista de negócios, como a query string inteira (chave=valor&...),
-- para reaplicar quando a URL chega sem parâmetro nenhum — é o que
-- cobre "após novo login": o usuário clica em Negócios no menu,
-- cai em /negocios puro, e o servidor redireciona para a última
-- combinação salva.
--
-- Formato texto (não jsonb): é a própria query string, sem estrutura
-- para validar — mais simples do que decompor e recompor um objeto
-- toda vez que uma coluna nova de filtro entrar.
-- ============================================================

alter table usuario
  add column preferencia_lista_negocios text;
