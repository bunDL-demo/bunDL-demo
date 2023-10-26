import React from 'react-redux';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { submitQuery, fetchSpeed, formatQuery } from '../../reducers/counterSlice';
import './query.css';
import Fields from '../fields/fields';

function Query() {
  const dispatch = useDispatch();
  const fields = useSelector((state) => state.counter.fields);
  const formattedQuery = useSelector((state) => state.counter.formattedQuery);
  const [click, setClick] = useState(true);
  const fieldnames = ['company', 'city', 'state'];
  const departmentnames = ['departmentName'];
  const productnames = ['productName', 'productDescription', 'price'];

  // renders with dependencies - formattedQuery initial empty string
  useEffect(() => {
    if (formattedQuery !== '') dispatch(fetchSpeed(formattedQuery));
  }, [click]);

  // once clicked dispatch submitQuery (puts fields arrays into log array) and formatQuery (runs and re renders useeffect with new state)
  const handleBoxClick = (e) => {
    e.preventDefault();
    console.log('handleboxclick');
    if (fields[0]) {
      dispatch(submitQuery());
      dispatch(formatQuery());
      click === true ? setClick(false) : setClick(true);
    }
  };

  return (
    <>
      <div className='wholecontainer'>
        <div className='finalQueryContainer'>
          <div className='queryBox'>
            <Fields />
            <div className='graphql-query'>
              <div className='query'>
                query {'{'}
                <div className='indent'>
                  company {'{'}
                  <div className='indent'>
                    {fields.map((item, index) => {
                      if (fieldnames.includes(item)) {
                        return (
                          <div key={index} className='field'>
                            {item}
                          </div>
                        );
                      } else return null;
                    })}
                    <div>
                      department {'{'}
                      {fields.map((item, index) => {
                        if (departmentnames.includes(item)) {
                          return (
                            <div key={index} className='field'>
                              {item}
                            </div>
                          );
                        } else return null;
                      })}
                      <div className='indent'>
                        product {'{'}
                        {fields.map((item, index) => {
                          if (productnames.includes(item)) {
                            return (
                              <div key={index} className='field'>
                                {item}
                              </div>
                            );
                          } else return null;
                        })}
                      </div>
                      {'}'}
                    </div>
                    {'}'}
                  </div>
                  {'}'}
                </div>
                {'}'}
              </div>
              <div className='buttonContainer'>
                {/* create onClick function to dispatch query / fetch functions - to obtain performance speeds depending on fields */}
                <button type='button' className='queryButton' onClick={(e) => handleBoxClick(e)}>
                  Submit Query
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Query;