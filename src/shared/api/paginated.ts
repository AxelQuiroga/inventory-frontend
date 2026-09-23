// Contrato de paginación del backend: todo listado paginado devuelve
// { data, total }. El tipo del frontend es ES PEOR si difiere del server:
// cada capa (handler MSW → api → página) debe interpretar el mismo shape.
export interface Paginated<T> {
  data: T[]
  total: number
}